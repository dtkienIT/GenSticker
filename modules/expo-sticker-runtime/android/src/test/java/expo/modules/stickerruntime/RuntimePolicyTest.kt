package expo.modules.stickerruntime

import ai.onnxruntime.providers.NNAPIFlags
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RuntimePolicyTest {
  @Test
  fun `debug x86 emulator with enough memory uses emulator NNAPI`() {
    val result = RuntimePolicy.evaluate(
      debug = true,
      emulator = true,
      supportedAbis = listOf("x86_64", "arm64-v8a"),
      totalMemoryMb = 8192,
    )

    assertTrue(result.supported)
    assertEquals("emulator", result.deviceKind)
    assertEquals("x86_64", result.architecture)
    assertEquals(SessionPolicy.EMULATOR_NNAPI, result.sessionPolicy)
  }

  @Test
  fun `release x86 emulator remains unsupported`() {
    val result = RuntimePolicy.evaluate(
      debug = false,
      emulator = true,
      supportedAbis = listOf("x86_64"),
      totalMemoryMb = 8192,
    )

    assertFalse(result.supported)
    assertEquals("DEVICE_UNSUPPORTED", result.reasonCode)
  }

  @Test
  fun `physical arm64 uses production NNAPI policy`() {
    val result = RuntimePolicy.evaluate(
      debug = false,
      emulator = false,
      supportedAbis = listOf("arm64-v8a"),
      totalMemoryMb = 8192,
    )

    assertTrue(result.supported)
    assertEquals("physical", result.deviceKind)
    assertEquals("arm64-v8a", result.architecture)
    assertEquals(SessionPolicy.PHYSICAL_NNAPI, result.sessionPolicy)
  }

  @Test
  fun `supported runtime still enforces six gigabytes`() {
    val result = RuntimePolicy.evaluate(
      debug = true,
      emulator = true,
      supportedAbis = listOf("x86_64"),
      totalMemoryMb = 6143,
    )

    assertFalse(result.supported)
    assertEquals("INSUFFICIENT_MEMORY", result.reasonCode)
  }

  @Test
  fun `physical policy disables NNAPI CPU fallback`() {
    val flags = RuntimePolicy.nnapiFlags(SessionPolicy.PHYSICAL_NNAPI)

    assertTrue(flags.contains(NNAPIFlags.USE_FP16))
    assertTrue(flags.contains(NNAPIFlags.CPU_DISABLED))
  }

  @Test
  fun `emulator policy keeps NNAPI reference CPU available`() {
    val flags = RuntimePolicy.nnapiFlags(SessionPolicy.EMULATOR_NNAPI)

    assertTrue(flags.contains(NNAPIFlags.USE_FP16))
    assertFalse(flags.contains(NNAPIFlags.CPU_DISABLED))
  }
}
