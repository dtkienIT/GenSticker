package expo.modules.stickerruntime

import ai.onnxruntime.OnnxJavaType
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import java.io.File
import java.io.FileOutputStream
import java.nio.FloatBuffer
import java.nio.LongBuffer
import java.nio.ShortBuffer
import java.util.Random
import java.util.concurrent.atomic.AtomicBoolean

internal class StickerInferenceEngine(
  private val context: Context,
  private val sessionPolicy: SessionPolicy,
) {
  private val environment = OrtEnvironment.getEnvironment()

  fun generate(
    request: Map<String, Any?>,
    cancellation: AtomicBoolean,
    onRunOptions: (OrtSession.RunOptions?) -> Unit,
    onProgress: (String, Float) -> Unit,
  ): Map<String, Any?> {
    val requestId = requireString(request, "requestId")
    val prompt = requireString(request, "prompt")
    val seed = (request["seed"] as? Number)?.toLong() ?: error("seed is required")
    require(request["contractVersion"] == "1.0") { "INVALID_REQUEST" }
    require(request["stylePresetId"] == "chibi") { "INVALID_REQUEST" }
    require((request["outputWidth"] as? Number)?.toInt() == WIDTH) { "INVALID_REQUEST" }
    require((request["outputHeight"] as? Number)?.toInt() == HEIGHT) { "INVALID_REQUEST" }

    val root = File(context.filesDir, "sticker-model/ready")
    val tokenizer = ClipTokenizer.fromJson(File(root, "tokenizer/tokenizer.json").readText())
    onProgress("validating", 1f)
    checkCancelled(cancellation)

    session(File(root, "text_encoder/model.onnx"), "text_encoder").use { textSession ->
      session(File(root, "unet/model.onnx"), "unet").use { unetSession ->
        session(File(root, "vae_decoder/model.onnx"), "vae_decoder").use { vaeSession ->
          onProgress("preparing_model", 1f)
          val hiddenStates = encodeText(
            textSession,
            tokenizer,
            "$prompt, chibi sticker, bold clean outline, centered subject",
            cancellation,
            onRunOptions,
            requestId,
          )
          val latents = denoise(
            unetSession,
            hiddenStates,
            seed,
            cancellation,
            onRunOptions,
            onProgress,
            requestId,
          )
          val bitmap = decode(vaeSession, latents, cancellation, onRunOptions, requestId)
          onProgress("removing_background", 0f)
          applySegmentation(bitmap, cancellation)
          onProgress("removing_background", 1f)
          onProgress("encoding", 0f)
          val output = encodePng(bitmap, requestId)
          onProgress("encoding", 1f)
          onProgress("completed", 1f)
          return mapOf(
            "requestId" to requestId,
            "localUri" to Uri.fromFile(output).toString(),
            "mimeType" to "image/png",
            "width" to WIDTH,
            "height" to HEIGHT,
            "adapterId" to "expo-sticker-runtime-onnx",
            "temporary" to true,
          )
        }
      }
    }
  }

  private fun encodeText(
    session: OrtSession,
    tokenizer: ClipTokenizer,
    prompt: String,
    cancellation: AtomicBoolean,
    onRunOptions: (OrtSession.RunOptions?) -> Unit,
    requestId: String,
  ): ShortArray {
    val ids = tokenizer.encode(NEGATIVE_PROMPT) + tokenizer.encode(prompt)
    OnnxTensor.createTensor(environment, LongBuffer.wrap(ids), longArrayOf(2, 77)).use { input ->
      return run(
        session,
        mapOf("input_ids" to input),
        cancellation,
        onRunOptions,
        requestId,
        "text_encoder",
      ) { result ->
        (result[0] as OnnxTensor).shortBuffer.copyRemaining()
      }
    }
  }

  private fun denoise(
    session: OrtSession,
    hiddenStates: ShortArray,
    seed: Long,
    cancellation: AtomicBoolean,
    onRunOptions: (OrtSession.RunOptions?) -> Unit,
    onProgress: (String, Float) -> Unit,
    requestId: String,
  ): FloatArray {
    var latents = SeededLatents.gaussian(seed, LATENT_SIZE)
    val noiseRandom = Random(seed xor 0x4c434dL)
    val timesteps = LcmScheduler.timesteps(STEPS)
    for (step in 0 until STEPS) {
      checkCancelled(cancellation)
      val batchedLatents = FloatArray(LATENT_SIZE * 2) { latents[it % LATENT_SIZE] }
      halfTensor(batchedLatents, longArrayOf(2, 4, 64, 64)).use { sample ->
        OnnxTensor.createTensor(
          environment,
          FloatBuffer.wrap(floatArrayOf(timesteps[step].toFloat())),
          longArrayOf(1),
        ).use { timestep ->
          halfTensor(hiddenStates, longArrayOf(2, 77, 768)).use { hidden ->
            val output = run(
              session,
              mapOf(
                "sample" to sample,
                "timestep" to timestep,
                "encoder_hidden_states" to hidden,
              ),
              cancellation,
              onRunOptions,
              requestId,
              "unet_step_$step",
            ) { result ->
              TensorMath.fromHalf((result[0] as OnnxTensor).shortBuffer.copyRemaining())
            }
            val guided = TensorMath.guidedNoise(output, LATENT_SIZE, GUIDANCE)
            val noise = gaussian(noiseRandom, LATENT_SIZE)
            latents = FloatArray(LATENT_SIZE) { index ->
              LcmScheduler.step(latents[index], guided[index], noise[index], step)
            }
          }
        }
      }
      onProgress("generating", (step + 1f) / STEPS)
    }
    return latents
  }

  private fun decode(
    session: OrtSession,
    latents: FloatArray,
    cancellation: AtomicBoolean,
    onRunOptions: (OrtSession.RunOptions?) -> Unit,
    requestId: String,
  ): Bitmap {
    val scaled = FloatArray(latents.size) { latents[it] / LATENT_SCALE }
    halfTensor(scaled, longArrayOf(1, 4, 64, 64)).use { input ->
      val decoded = run(
        session,
        mapOf("latent_sample" to input),
        cancellation,
        onRunOptions,
        requestId,
        "vae_decoder",
      ) { result -> TensorMath.fromHalf((result[0] as OnnxTensor).shortBuffer.copyRemaining()) }
      return Bitmap.createBitmap(
        TensorMath.decodedPixels(decoded, WIDTH, HEIGHT),
        WIDTH,
        HEIGHT,
        Bitmap.Config.ARGB_8888,
      )
    }
  }

  private fun applySegmentation(bitmap: Bitmap, cancellation: AtomicBoolean) {
    checkCancelled(cancellation)
    val options = SubjectSegmenterOptions.Builder()
      .enableForegroundConfidenceMask()
      .build()
    SubjectSegmentation.getClient(options).use { segmenter ->
      val result = Tasks.await(segmenter.process(InputImage.fromBitmap(bitmap, 0)))
      checkCancelled(cancellation)
      val mask = result.foregroundConfidenceMask
        ?: throw IllegalStateException("SEGMENTATION_FAILED")
      val pixels = IntArray(WIDTH * HEIGHT)
      bitmap.getPixels(pixels, 0, WIDTH, 0, 0, WIDTH, HEIGHT)
      repeat(pixels.size) { index ->
        pixels[index] = AlphaComposer.withAlpha(pixels[index], mask.get(index))
      }
      bitmap.setPixels(pixels, 0, WIDTH, 0, 0, WIDTH, HEIGHT)
    }
  }

  private fun encodePng(bitmap: Bitmap, requestId: String): File {
    val directory = File(context.cacheDir, "generated-stickers").also(File::mkdirs)
    val output = File(directory, "$requestId.png")
    FileOutputStream(output).use { stream ->
      check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) { "ASSET_ENCODING_FAILED" }
      stream.fd.sync()
    }
    return output
  }

  private fun session(model: File, component: String): OrtSession {
    require(model.isFile) { "MODEL_NOT_AVAILABLE" }
    Log.i(TAG, RuntimeDiagnostics.sessionCreate(component, sessionPolicy))
    val options = OrtSession.SessionOptions()
    options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
    options.addNnapi(RuntimePolicy.nnapiFlags(sessionPolicy))
    return try {
      environment.createSession(model.absolutePath, options).also {
        Log.i(TAG, RuntimeDiagnostics.sessionReady(component))
      }
    } catch (error: Throwable) {
      options.close()
      throw IllegalStateException("RUNTIME_UNAVAILABLE:${error.message}", error)
    }
  }

  private inline fun <T> run(
    session: OrtSession,
    inputs: Map<String, OnnxTensor>,
    cancellation: AtomicBoolean,
    onRunOptions: (OrtSession.RunOptions?) -> Unit,
    requestId: String,
    component: String,
    read: (OrtSession.Result) -> T,
  ): T {
    checkCancelled(cancellation)
    OrtSession.RunOptions().use { options ->
      onRunOptions(options)
      Log.i(TAG, RuntimeDiagnostics.runStart(requestId, component))
      try {
        session.run(inputs, options).use { result -> return read(result) }
      } finally {
        Log.i(TAG, RuntimeDiagnostics.runEnd(requestId, component))
        onRunOptions(null)
      }
    }
  }

  private fun halfTensor(values: FloatArray, shape: LongArray): OnnxTensor =
    halfTensor(TensorMath.toHalf(values), shape)

  private fun halfTensor(values: ShortArray, shape: LongArray): OnnxTensor =
    OnnxTensor.createTensor(environment, ShortBuffer.wrap(values), shape, OnnxJavaType.FLOAT16)

  private fun checkCancelled(cancellation: AtomicBoolean) {
    check(!cancellation.get()) { "GENERATION_CANCELLED" }
  }

  private fun requireString(request: Map<String, Any?>, key: String): String =
    (request[key] as? String)?.takeIf(String::isNotBlank) ?: error("$key is required")

  private fun ShortBuffer.copyRemaining(): ShortArray =
    ShortArray(remaining()).also(::get)

  private fun gaussian(random: Random, size: Int): FloatArray =
    FloatArray(size) { random.nextGaussian().toFloat() }

  companion object {
    private const val WIDTH = 512
    private const val HEIGHT = 512
    private const val STEPS = 4
    private const val GUIDANCE = 1.5f
    private const val LATENT_SIZE = 4 * 64 * 64
    private const val LATENT_SCALE = 0.18215f
    private const val NEGATIVE_PROMPT =
      "photorealistic, text, watermark, gore, explicit content"
    private const val TAG = "ExpoStickerRuntime"
  }
}
