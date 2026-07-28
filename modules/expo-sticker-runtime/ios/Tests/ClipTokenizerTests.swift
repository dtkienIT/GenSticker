import XCTest
@testable import ExpoStickerRuntimeCore

final class ClipTokenizerTests: XCTestCase {
  func testEncodesAndPadsPinnedClipFixture() throws {
    let tokenizer = try ClipTokenizer.fromJSON(
      """
      {"model":{"vocab":{"<|startoftext|>":49406,"<|endoftext|>":49407,"a</w>":320,"cat</w>":2368},"merges":[["a","t</w>"],["c","a"],["c","at</w>"]]}}
      """
    )

    let ids = tokenizer.encode("A CAT")

    XCTAssertEqual(ids.count, 77)
    XCTAssertEqual(Array(ids.prefix(4)), [49_406, 320, 2_368, 49_407])
    XCTAssertEqual(ids.last, 49_407)
  }

  func testTruncationAlwaysRetainsEndToken() throws {
    let tokenizer = try ClipTokenizer.fromJSON(
      """
      {"model":{"vocab":{"<|startoftext|>":49406,"<|endoftext|>":49407,"a</w>":320},"merges":[]}}
      """
    )

    let ids = tokenizer.encode(Array(repeating: "a", count: 100).joined(separator: " "))

    XCTAssertEqual(ids.first, 49_406)
    XCTAssertEqual(ids.last, 49_407)
    XCTAssertEqual(ids.filter { $0 == 320 }.count, 75)
  }
}
