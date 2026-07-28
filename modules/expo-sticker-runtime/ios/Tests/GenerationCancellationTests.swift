import XCTest
@testable import ExpoStickerRuntimeCore

final class GenerationCancellationTests: XCTestCase {
  func testCancellationIsIdempotentAndTerminal() throws {
    let cancellation = GenerationCancellation()

    XCTAssertNoThrow(try cancellation.check())
    XCTAssertTrue(cancellation.cancel())
    XCTAssertFalse(cancellation.cancel())
    XCTAssertThrowsError(try cancellation.check())
  }
}
