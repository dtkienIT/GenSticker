import XCTest
@testable import ExpoStickerRuntimeCore

final class TensorMathTests: XCTestCase {
  func testGuidanceCombinesUnconditionalAndConditionalBatches() throws {
    let result = try TensorMath.guidedNoise(
      [1, 2, 5, 10],
      batchElementSize: 2,
      guidance: 1.5
    )

    XCTAssertEqual(result, [7, 14])
  }

  func testDecodedPlanarRGBIsClampedAndConvertedToRGBA() throws {
    let bytes = try TensorMath.decodedRGBA(
      [-1, 1, 0, 0, 1, -1],
      width: 2,
      height: 1
    )

    XCTAssertEqual(bytes, [0, 128, 255, 255, 255, 128, 0, 255])
  }

  func testMaskAlphaIsClampedAndFeathered() {
    XCTAssertEqual(AlphaComposer.alpha(mask: -1), 0)
    XCTAssertEqual(AlphaComposer.alpha(mask: 0.5), 128)
    XCTAssertEqual(AlphaComposer.alpha(mask: 2), 255)
  }
}

