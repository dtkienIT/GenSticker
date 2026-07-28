import XCTest
@testable import ExpoStickerRuntimeCore

final class LcmSchedulerTests: XCTestCase {
  func testFourStepsUsePinnedDescendingTimesteps() throws {
    XCTAssertEqual(try LcmScheduler.timesteps(inferenceSteps: 4), [999, 759, 499, 259])
  }

  func testStepMatchesPinnedDiffusersReferenceVectors() throws {
    XCTAssertEqual(
      try LcmScheduler.step(sample: 0.25, modelOutput: -0.5, noise: 0.75, stepIndex: 0),
      3.2367105,
      accuracy: 0.000001
    )
    XCTAssertEqual(
      try LcmScheduler.step(sample: 0.25, modelOutput: -0.5, noise: 0.75, stepIndex: 3),
      0.66765785,
      accuracy: 0.000001
    )
  }

  func testJavaSeededLatentsMatchAndroidRuntime() {
    let values = SeededLatents.gaussian(seed: 42, count: 4)

    XCTAssertEqual(values[0], -0.32490116, accuracy: 0.000001)
    XCTAssertEqual(values[1], -0.2595975, accuracy: 0.000001)
    XCTAssertEqual(values[2], 0.741113, accuracy: 0.000001)
    XCTAssertEqual(values[3], -0.22751506, accuracy: 0.000001)
  }
}

