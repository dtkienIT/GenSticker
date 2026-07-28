import Foundation

enum TensorMath {
  static func guidedNoise(
    _ batchedOutput: [Float],
    batchElementSize: Int,
    guidance: Float
  ) throws -> [Float] {
    guard batchElementSize >= 0, batchedOutput.count == batchElementSize * 2 else {
      throw RuntimeCoreError.invalidArgument("batchedOutput")
    }
    return (0..<batchElementSize).map { index in
      let unconditional = batchedOutput[index]
      return unconditional
        + guidance * (batchedOutput[index + batchElementSize] - unconditional)
    }
  }

  static func decodedRGBA(_ chw: [Float], width: Int, height: Int) throws -> [UInt8] {
    let plane = width * height
    guard width > 0, height > 0, chw.count == plane * 3 else {
      throw RuntimeCoreError.invalidArgument("decodedImage")
    }
    return (0..<plane).flatMap { index -> [UInt8] in
      [
        channel(chw[index]),
        channel(chw[plane + index]),
        channel(chw[plane * 2 + index]),
        255,
      ]
    }
  }

  private static func channel(_ value: Float) -> UInt8 {
    UInt8(max(0, min(255, Int(round((max(-1, min(1, value)) + 1) * 127.5)))))
  }
}

enum AlphaComposer {
  static func alpha(mask: Float) -> UInt8 {
    let clamped = max(0, min(1, mask))
    let smooth = clamped * clamped * (3 - 2 * clamped)
    return UInt8(max(0, min(255, Int(round(smooth * 255)))))
  }
}
