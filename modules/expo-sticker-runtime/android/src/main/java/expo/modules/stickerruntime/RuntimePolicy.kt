package expo.modules.stickerruntime

import ai.onnxruntime.providers.NNAPIFlags
import java.util.EnumSet

internal enum class SessionPolicy {
  PHYSICAL_NNAPI,
  EMULATOR_NNAPI,
}

internal data class RuntimeDecision(
  val supported: Boolean,
  val reasonCode: String? = null,
  val deviceKind: String,
  val architecture: String,
  val sessionPolicy: SessionPolicy? = null,
)

internal object RuntimePolicy {
  private const val MINIMUM_MEMORY_MB = 6144L

  fun evaluate(
    debug: Boolean,
    emulator: Boolean,
    supportedAbis: List<String>,
    totalMemoryMb: Long,
  ): RuntimeDecision {
    val architecture = supportedAbis.firstOrNull().orEmpty()
    val sessionPolicy = when {
      !emulator && supportedAbis.contains("arm64-v8a") -> SessionPolicy.PHYSICAL_NNAPI
      debug && emulator && architecture == "x86_64" -> SessionPolicy.EMULATOR_NNAPI
      else -> null
    }
    val deviceKind = if (emulator) "emulator" else "physical"
    if (sessionPolicy == null) {
      return RuntimeDecision(
        supported = false,
        reasonCode = "DEVICE_UNSUPPORTED",
        deviceKind = deviceKind,
        architecture = architecture,
      )
    }
    if (totalMemoryMb < MINIMUM_MEMORY_MB) {
      return RuntimeDecision(
        supported = false,
        reasonCode = "INSUFFICIENT_MEMORY",
        deviceKind = deviceKind,
        architecture = architecture,
      )
    }
    return RuntimeDecision(
      supported = true,
      deviceKind = deviceKind,
      architecture = architecture,
      sessionPolicy = sessionPolicy,
    )
  }

  fun nnapiFlags(policy: SessionPolicy): EnumSet<NNAPIFlags> = when (policy) {
    SessionPolicy.PHYSICAL_NNAPI ->
      EnumSet.of(NNAPIFlags.USE_FP16, NNAPIFlags.CPU_DISABLED)
    SessionPolicy.EMULATOR_NNAPI ->
      EnumSet.of(NNAPIFlags.USE_FP16)
  }
}
