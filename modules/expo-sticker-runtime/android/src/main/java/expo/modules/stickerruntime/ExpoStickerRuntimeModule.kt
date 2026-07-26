package expo.modules.stickerruntime

import android.app.ActivityManager
import android.os.Build
import android.os.StatFs
import android.util.Log
import ai.onnxruntime.OrtSession
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.delay
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

private data class ActiveGeneration(
  val cancelled: AtomicBoolean = AtomicBoolean(false),
  val runOptions: AtomicReference<OrtSession.RunOptions?> = AtomicReference(null),
)

class ExpoStickerRuntimeModule : Module() {
  private val activeRequests = ConcurrentHashMap<String, ActiveGeneration>()
  private val context get() = requireNotNull(appContext.reactContext)
  private val bundles by lazy { ModelBundleManager(context) }
  private val inference by lazy {
    StickerInferenceEngine(
      context,
      requireNotNull(runtimeDecision().sessionPolicy) { "RUNTIME_UNAVAILABLE" },
    )
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoStickerRuntime")
    Events("onModelDownloadProgress", "onGenerationProgress")

    AsyncFunction("getCapabilities").SuspendBody<Map<String, Any?>> {
      capabilities()
    }

    AsyncFunction("getModelBundleState").SuspendBody<Map<String, Any?>> {
      bundleState()
    }

    AsyncFunction("startModelDownload").SuspendBody<Map<String, Any?>> {
      val manifest = bundles.loadManifest()
      if (!bundles.hasEnoughStorage(manifest)) {
        return@SuspendBody state("failed", "INSUFFICIENT_STORAGE", "Not enough free storage")
      }
      bundles.cancel(manifest)
      bundles.enqueue(manifest)
      while (true) {
        val (downloaded, total) = bundles.progress(manifest)
        sendEvent("onModelDownloadProgress", mapOf(
          "phase" to "downloading",
          "downloadedBytes" to downloaded,
          "totalBytes" to total,
        ))
        if (downloaded >= total) break
        delay(500)
      }
      sendEvent("onModelDownloadProgress", mapOf(
        "phase" to "verifying",
        "downloadedBytes" to manifest.artifactBytes,
        "totalBytes" to manifest.artifactBytes,
      ))
      bundles.promote(manifest)
      state("ready")
    }

    AsyncFunction("installLocalModel").SuspendBody<Map<String, Any?>> {
      if (!BuildConfig.DEBUG) {
        return@SuspendBody state(
          "failed",
          "LOCAL_MODEL_NOT_STAGED",
          "Local model import is available only in debug builds",
        )
      }
      val manifest = bundles.loadManifest()
      sendEvent("onModelDownloadProgress", mapOf(
        "phase" to "verifying",
        "downloadedBytes" to 0L,
        "totalBytes" to manifest.artifactBytes,
      ))
      try {
        bundles.installLocal(manifest)
        sendEvent("onModelDownloadProgress", mapOf(
          "phase" to "verifying",
          "downloadedBytes" to manifest.artifactBytes,
          "totalBytes" to manifest.artifactBytes,
        ))
        state("ready")
      } catch (error: LocalModelImportException) {
        Log.e("ExpoStickerRuntime", error.message, error)
        state("failed", error.code, error.message ?: error.code)
      } catch (error: Throwable) {
        state("failed", "MODEL_PROMOTION_FAILED", error.message ?: "Local model import failed")
      }
    }

    AsyncFunction("cancelModelDownload").SuspendBody<Map<String, Any?>> {
      runCatching { bundles.cancel(bundles.loadManifest()) }
      state("missing")
    }

    AsyncFunction("prepareModel").SuspendBody<Map<String, Any?>, Map<String, Any?>> { _ ->
      val manifest = bundles.loadManifest()
      if (!bundles.isReady(manifest)) {
        mapOf(
          "contractVersion" to "1.0",
          "modelId" to manifest.modelId,
          "modelVersion" to manifest.modelVersion,
          "ready" to false,
          "errorCode" to "MODEL_NOT_AVAILABLE",
        )
      } else {
        mapOf(
          "contractVersion" to "1.0",
          "modelId" to manifest.modelId,
          "modelVersion" to manifest.modelVersion,
          "ready" to true,
        )
      }
    }

    AsyncFunction("generate").SuspendBody<Map<String, Any?>, Map<String, Any?>> { request ->
      val requestId = request["requestId"] as? String ?: error("requestId is required")
      val active = ActiveGeneration()
      check(activeRequests.putIfAbsent(requestId, active) == null) {
        "GENERATION_BUSY"
      }
      val startedAt = System.currentTimeMillis()
      val sequence = AtomicInteger(0)
      try {
        val manifest = bundles.loadManifest()
        check(bundles.isReady(manifest)) { "MODEL_NOT_AVAILABLE" }
        inference.generate(
          request,
          active.cancelled,
          active.runOptions::set,
        ) { stage, progress ->
          sendEvent(
            "onGenerationProgress",
            mapOf(
              "contractVersion" to "1.0",
              "requestId" to requestId,
              "sequence" to sequence.incrementAndGet(),
              "stage" to stage,
              "stageProgress" to progress,
              "elapsedMs" to System.currentTimeMillis() - startedAt,
            ),
          )
        }
      } catch (error: Throwable) {
        File(context.cacheDir, "generated-stickers/$requestId.png").delete()
        if (active.cancelled.get()) {
          throw IllegalStateException("GENERATION_CANCELLED", error)
        }
        Log.e("ExpoStickerRuntime", "Generation $requestId failed: ${error.message}", error)
        throw error
      } finally {
        activeRequests.remove(requestId)
      }
    }

    AsyncFunction("cancel").SuspendBody<Map<String, Any?>, String> { requestId ->
      val active = activeRequests[requestId]
      val accepted = active?.cancelled?.compareAndSet(false, true) ?: false
      if (accepted) {
        val runOptions = active?.runOptions?.get()
        Log.i(
          "ExpoStickerRuntime",
          RuntimeDiagnostics.cancellationAccepted(requestId, runOptions != null),
        )
        runCatching { runOptions?.setTerminate(true) }
      }
      mapOf(
        "accepted" to accepted,
        "outcome" to if (accepted) "cancellation_requested" else "not_found",
      )
    }
  }

  private fun capabilities(): Map<String, Any?> {
    val decision = runtimeDecision()
    val storage = StatFs(context.filesDir.absolutePath).availableBytes
    return if (decision.supported) {
      mapOf(
        "supported" to true,
        "adapterId" to "expo-sticker-runtime-onnx",
        "totalMemoryClassMb" to totalMemoryMb(),
        "deviceKind" to decision.deviceKind,
        "architecture" to decision.architecture,
        "availableDelegates" to listOf("NNAPI"),
        "selectedDelegate" to if (decision.sessionPolicy == SessionPolicy.EMULATOR_NNAPI) {
          "NNAPI_REFERENCE"
        } else {
          "NNAPI"
        },
        "runtimeVersion" to "1.27.0",
        "availableStorageBytes" to storage,
      )
    } else {
      mapOf(
        "supported" to false,
        "reasonCode" to decision.reasonCode,
        "deviceKind" to decision.deviceKind,
        "architecture" to decision.architecture,
      )
    }
  }

  private fun runtimeDecision(): RuntimeDecision = RuntimePolicy.evaluate(
    debug = BuildConfig.DEBUG,
    emulator = isEmulator(),
    supportedAbis = Build.SUPPORTED_ABIS.toList(),
    totalMemoryMb = totalMemoryMb(),
  )

  private fun totalMemoryMb(): Long {
    val activityManager = context.getSystemService(ActivityManager::class.java)
    val memory = ActivityManager.MemoryInfo().also(activityManager::getMemoryInfo)
    return memory.totalMem / (1024 * 1024)
  }

  private fun isEmulator(): Boolean =
    Build.FINGERPRINT.startsWith("generic") ||
      Build.FINGERPRINT.contains("emulator") ||
      Build.MODEL.contains("Emulator") ||
      Build.MODEL.contains("Android SDK built for") ||
      Build.PRODUCT.contains("sdk_gphone") ||
      Build.HARDWARE == "ranchu" ||
      Build.HARDWARE == "goldfish"

  private fun bundleState(): Map<String, Any?> = runCatching {
    val manifest = bundles.loadManifest()
    if (bundles.isReady(manifest)) state("ready") else state("missing")
  }.getOrElse {
    state("failed", "MODEL_MANIFEST_MISSING", it.message ?: "Model manifest is unavailable")
  }

  private fun state(status: String, code: String? = null, message: String? = null): Map<String, Any?> =
    mapOf(
      "status" to status,
      "modelId" to "lcm-sd15-chibi",
      "modelVersion" to "1.0.1",
      "downloadedBytes" to if (status == "ready") runCatching {
        bundles.loadManifest().artifactBytes
      }.getOrDefault(0L) else 0L,
      "totalBytes" to runCatching { bundles.loadManifest().artifactBytes }.getOrDefault(0L),
      "errorCode" to code,
      "message" to message,
    )
}
