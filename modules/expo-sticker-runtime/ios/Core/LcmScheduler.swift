import Foundation

enum LcmScheduler {
  private static let trainingSteps = 1_000
  private static let distilledOriginSteps = 50
  private static let fourStepAlphaCumprod = [
    0.00466009508818388,
    0.05221289023756981,
    0.27766942977905273,
    0.6589752435684204,
  ]

  static func timesteps(inferenceSteps: Int) throws -> [Int] {
    guard (1...distilledOriginSteps).contains(inferenceSteps) else {
      throw RuntimeCoreError.invalidArgument("inferenceSteps")
    }
    let origin = (0..<distilledOriginSteps).map { trainingSteps - 1 - $0 * 20 }
    return (0..<inferenceSteps).map { origin[$0 * distilledOriginSteps / inferenceSteps] }
  }

  static func step(
    sample: Float,
    modelOutput: Float,
    noise: Float,
    stepIndex: Int
  ) throws -> Float {
    guard fourStepAlphaCumprod.indices.contains(stepIndex) else {
      throw RuntimeCoreError.invalidArgument("stepIndex")
    }
    let alpha = fourStepAlphaCumprod[stepIndex]
    let beta = 1 - alpha
    let predictedOriginal = (Double(sample) - sqrt(beta) * Double(modelOutput)) / sqrt(alpha)
    let scaledTimestep = Double(try timesteps(inferenceSteps: 4)[stepIndex]) * 10
    let sigmaDataSquared = 0.25
    let denominator = scaledTimestep * scaledTimestep + sigmaDataSquared
    let skip = sigmaDataSquared / denominator
    let output = scaledTimestep / sqrt(denominator)
    let denoised = skip * Double(sample) + output * predictedOriginal
    guard stepIndex < fourStepAlphaCumprod.count - 1 else {
      return Float(denoised)
    }
    let previousAlpha = fourStepAlphaCumprod[stepIndex + 1]
    return Float(sqrt(previousAlpha) * denoised + sqrt(1 - previousAlpha) * Double(noise))
  }
}

enum SeededLatents {
  static func gaussian(seed: Int64, count: Int) -> [Float] {
    var random = JavaRandom(seed: seed)
    return (0..<max(count, 0)).map { _ in
      let u1 = max(random.nextDouble(), Double.leastNonzeroMagnitude)
      let u2 = random.nextDouble()
      return Float(sqrt(-2 * log(u1)) * cos(2 * .pi * u2))
    }
  }
}

private struct JavaRandom {
  private static let multiplier: UInt64 = 0x5DEECE66D
  private static let addend: UInt64 = 0xB
  private static let mask: UInt64 = (1 << 48) - 1
  private var state: UInt64

  init(seed: Int64) {
    state = (UInt64(bitPattern: seed) ^ Self.multiplier) & Self.mask
  }

  mutating func nextDouble() -> Double {
    let high = UInt64(next(bits: 26))
    let low = UInt64(next(bits: 27))
    return Double((high << 27) + low) / Double(UInt64(1) << 53)
  }

  private mutating func next(bits: Int) -> UInt32 {
    state = (state &* Self.multiplier &+ Self.addend) & Self.mask
    return UInt32(state >> UInt64(48 - bits))
  }
}

enum RuntimeCoreError: Error, Equatable {
  case invalidArgument(String)
  case invalidManifest(String)
}
