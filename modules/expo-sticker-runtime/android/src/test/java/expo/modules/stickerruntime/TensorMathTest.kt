package expo.modules.stickerruntime

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class TensorMathTest {
  @Test
  fun `classifier free guidance combines unconditional and conditional batches`() {
    val output = floatArrayOf(1f, 2f, 5f, 10f)

    assertArrayEquals(
      floatArrayOf(7f, 14f),
      TensorMath.guidedNoise(output, batchElementSize = 2, guidance = 1.5f),
      0f,
    )
  }

  @Test
  fun `decoded planar RGB is clamped and converted to opaque pixels`() {
    val chw = floatArrayOf(
      -1f, 1f,
      0f, 0f,
      1f, -1f,
    )

    val pixels = TensorMath.decodedPixels(chw, width = 2, height = 1)

    assertEquals(0xff0080ff.toInt(), pixels[0])
    assertEquals(0xffff8000.toInt(), pixels[1])
  }

  @Test
  fun `IEEE half conversion preserves representative values`() {
    val values = floatArrayOf(-1f, 0f, 0.5f, 1f, 10f)

    val roundTrip = TensorMath.fromHalf(TensorMath.toHalf(values))

    assertArrayEquals(values, roundTrip, 0.001f)
  }
}
