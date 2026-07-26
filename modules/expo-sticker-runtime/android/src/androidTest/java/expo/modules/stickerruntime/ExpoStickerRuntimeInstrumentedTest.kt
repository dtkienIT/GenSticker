package expo.modules.stickerruntime

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import android.util.Base64
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.nio.FloatBuffer
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ExpoStickerRuntimeInstrumentedTest {
  @Test
  fun expoModuleExportsTheEmulatorBridgeContract() {
    val definition = ExpoStickerRuntimeModule().definition()

    assertEquals("ExpoStickerRuntime", definition.name)
    assertTrue(definition.asyncFunctions.containsKey("getCapabilities"))
    assertTrue(definition.asyncFunctions.containsKey("installLocalModel"))
    assertTrue(definition.asyncFunctions.containsKey("generate"))
    assertTrue(definition.asyncFunctions.containsKey("cancel"))
  }

  @Test
  fun bundledOnnxRuntimeExecutesTinyFixtureGraph() {
    val model = Base64.decode(TINY_IDENTITY_MODEL, Base64.DEFAULT)
    OrtEnvironment.getEnvironment().use { environment ->
      environment.createSession(model).use { session ->
        OnnxTensor.createTensor(
          environment,
          FloatBuffer.wrap(floatArrayOf(0.25f)),
          longArrayOf(1),
        ).use { input ->
          session.run(mapOf("input" to input)).use { result ->
            assertArrayEquals(floatArrayOf(0.25f), (result[0].value as FloatArray), 0f)
          }
        }
      }
    }
  }

  private companion object {
    const val TINY_IDENTITY_MODEL =
      "CAkSD2dlbnN0aWNrZXItdGVzdDpVChkKBWlucHV0EgZvdXRwdXQiCElkZW50aXR5" +
        "Eg10aW55LWlkZW50aXR5WhMKBWlucHV0EgoKCAgBEgQKAggBYhQKBm91dHB1dB" +
        "IKCggIARIECgIIAUIECgAQEQ=="
  }
}
