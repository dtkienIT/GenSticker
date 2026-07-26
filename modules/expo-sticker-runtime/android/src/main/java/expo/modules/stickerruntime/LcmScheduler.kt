package expo.modules.stickerruntime

import java.util.Random
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

internal object LcmScheduler {
  private const val TRAINING_STEPS = 1000
  private const val DISTILLED_ORIGIN_STEPS = 50
  private val fourStepAlphaCumprod = doubleArrayOf(
    0.00466009508818388,
    0.05221289023756981,
    0.27766942977905273,
    0.6589752435684204,
  )

  fun timesteps(inferenceSteps: Int): IntArray {
    require(inferenceSteps in 1..DISTILLED_ORIGIN_STEPS)
    val origin = IntArray(DISTILLED_ORIGIN_STEPS) { TRAINING_STEPS - 1 - it * 20 }
    return IntArray(inferenceSteps) { index ->
      origin[index * DISTILLED_ORIGIN_STEPS / inferenceSteps]
    }
  }

  fun step(
    sample: Float,
    modelOutput: Float,
    noise: Float,
    stepIndex: Int,
  ): Float {
    require(stepIndex in fourStepAlphaCumprod.indices)
    val alpha = fourStepAlphaCumprod[stepIndex]
    val beta = 1.0 - alpha
    val predictedOriginal = (sample - sqrt(beta) * modelOutput) / sqrt(alpha)
    val scaledTimestep = timesteps(4)[stepIndex] * 10.0
    val sigmaDataSquared = 0.25
    val denominator = scaledTimestep * scaledTimestep + sigmaDataSquared
    val skip = sigmaDataSquared / denominator
    val output = scaledTimestep / sqrt(denominator)
    val denoised = skip * sample + output * predictedOriginal
    if (stepIndex == fourStepAlphaCumprod.lastIndex) {
      return denoised.toFloat()
    }
    val previousAlpha = fourStepAlphaCumprod[stepIndex + 1]
    return (sqrt(previousAlpha) * denoised + sqrt(1.0 - previousAlpha) * noise).toFloat()
  }
}

internal object SeededLatents {
  fun gaussian(seed: Long, size: Int): FloatArray {
    val random = Random(seed)
    return FloatArray(size) {
      val u1 = max(random.nextDouble(), Double.MIN_VALUE)
      val u2 = random.nextDouble()
      (sqrt(-2.0 * kotlin.math.ln(u1)) * kotlin.math.cos(2.0 * Math.PI * u2)).toFloat()
    }
  }
}

internal object AlphaComposer {
  fun toAlpha(mask: Float): Int {
    val x = min(1f, max(0f, mask))
    val smooth = x * x * (3f - 2f * x)
    return (smooth * 255f).roundToInt()
  }

  fun withAlpha(argb: Int, mask: Float): Int =
    (toAlpha(mask) shl 24) or (argb and 0x00ffffff)
}
