import XCTest
@testable import ExpoStickerRuntimeCore

final class RuntimePolicyTests: XCTestCase {
  func testPhysicalIPhone12IsSupported() {
    let decision = RuntimePolicy.evaluate(
      isSimulator: false,
      machineIdentifier: "iPhone13,2",
      operatingSystemMajor: 17,
      physicalMemoryMb: 4_096
    )

    XCTAssertTrue(decision.supported)
    XCTAssertEqual(decision.deviceKind, "physical")
    XCTAssertEqual(decision.architecture, "arm64")
    XCTAssertEqual(decision.selectedDelegate, "ANE")
  }

  func testSimulatorIsUnavailableForNativeInference() {
    let decision = RuntimePolicy.evaluate(
      isSimulator: true,
      machineIdentifier: "arm64",
      operatingSystemMajor: 17,
      physicalMemoryMb: 16_384
    )

    XCTAssertFalse(decision.supported)
    XCTAssertEqual(decision.reasonCode, "DEVICE_UNSUPPORTED")
  }

  func testPreA14PhoneIsUnavailable() {
    let decision = RuntimePolicy.evaluate(
      isSimulator: false,
      machineIdentifier: "iPhone12,1",
      operatingSystemMajor: 17,
      physicalMemoryMb: 4_096
    )

    XCTAssertFalse(decision.supported)
    XCTAssertEqual(decision.reasonCode, "DEVICE_UNSUPPORTED")
  }

  func testIosBelowSeventeenIsUnavailable() {
    let decision = RuntimePolicy.evaluate(
      isSimulator: false,
      machineIdentifier: "iPhone13,2",
      operatingSystemMajor: 16,
      physicalMemoryMb: 4_096
    )

    XCTAssertFalse(decision.supported)
    XCTAssertEqual(decision.reasonCode, "DEVICE_UNSUPPORTED")
  }
}

