package expo.modules.stickerruntime

import kotlin.math.roundToInt

internal object TensorMath {
  fun toHalf(values: FloatArray): ShortArray =
    ShortArray(values.size) { index -> floatToHalf(values[index]) }

  fun fromHalf(values: ShortArray): FloatArray =
    FloatArray(values.size) { index -> halfToFloat(values[index]) }

  fun guidedNoise(
    batchedOutput: FloatArray,
    batchElementSize: Int,
    guidance: Float,
  ): FloatArray {
    require(batchedOutput.size == batchElementSize * 2)
    return FloatArray(batchElementSize) { index ->
      val unconditional = batchedOutput[index]
      unconditional + guidance * (batchedOutput[index + batchElementSize] - unconditional)
    }
  }

  fun decodedPixels(chw: FloatArray, width: Int, height: Int): IntArray {
    val plane = width * height
    require(chw.size == plane * 3)
    return IntArray(plane) { index ->
      val red = channel(chw[index])
      val green = channel(chw[plane + index])
      val blue = channel(chw[plane * 2 + index])
      (0xff shl 24) or (red shl 16) or (green shl 8) or blue
    }
  }

  private fun channel(value: Float): Int =
    (((value.coerceIn(-1f, 1f) + 1f) * 127.5f).roundToInt()).coerceIn(0, 255)

  private fun floatToHalf(value: Float): Short {
    val bits = value.toRawBits()
    val sign = (bits ushr 16) and 0x8000
    val magnitude = (bits and 0x7fffffff) + 0x1000
    val half = when {
      magnitude >= 0x47800000 -> {
        if ((bits and 0x7fffffff) >= 0x47800000) {
          if (magnitude < 0x7f800000) 0x7c00 else 0x7c00 or ((bits and 0x007fffff) ushr 13)
        } else {
          0x7bff
        }
      }
      magnitude >= 0x38800000 -> (magnitude - 0x38000000) ushr 13
      magnitude < 0x33000000 -> 0
      else -> {
        val exponent = (bits and 0x7fffffff) ushr 23
        (((bits and 0x7fffff) or 0x800000) + (0x800000 ushr (exponent - 102))) ushr
          (126 - exponent)
      }
    }
    return (sign or half).toShort()
  }

  private fun halfToFloat(value: Short): Float {
    val half = value.toInt() and 0xffff
    val sign = (half and 0x8000) shl 16
    var exponent = (half ushr 10) and 0x1f
    var fraction = half and 0x03ff
    val bits = when {
      exponent == 0 -> {
        if (fraction == 0) {
          sign
        } else {
          while ((fraction and 0x0400) == 0) {
            fraction = fraction shl 1
            exponent -= 1
          }
          fraction = fraction and 0x03ff
          sign or ((exponent + 127 - 15 + 1) shl 23) or (fraction shl 13)
        }
      }
      exponent == 0x1f -> sign or 0x7f800000 or (fraction shl 13)
      else -> sign or ((exponent + 127 - 15) shl 23) or (fraction shl 13)
    }
    return Float.fromBits(bits)
  }
}
