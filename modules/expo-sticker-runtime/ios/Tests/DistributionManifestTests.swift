import XCTest
@testable import ExpoStickerRuntimeCore

final class DistributionManifestTests: XCTestCase {
  func testSafeArchivePathsRemainInsideStagingDirectory() {
    XCTAssertTrue(DistributionManifest.isSafeArchivePath("models/TextEncoder.mlmodelc/model.mil"))
    XCTAssertFalse(DistributionManifest.isSafeArchivePath("../outside"))
    XCTAssertFalse(DistributionManifest.isSafeArchivePath("/absolute"))
    XCTAssertFalse(DistributionManifest.isSafeArchivePath("models/../../outside"))
  }

  func testDecodesPinnedCoreMLDistribution() throws {
    let digest = String(repeating: "a", count: 64)
    let json = """
      {
        "manifestVersion":"1.0",
        "modelId":"lcm-sd15-chibi",
        "modelVersion":"1.0.1-coreml.1",
        "runtime":"coreml-ios",
        "runtimeVersion":"ios-17",
        "quantization":"palettized-4bit",
        "supportedDelegates":["ANE","GPU","CPU"],
        "selectedDelegate":"ANE",
        "minimumMemoryMb":4096,
        "minimumStorageBytes":2048,
        "artifactBytes":1024,
        "artifactSha256":"\(digest)",
        "uncompressedBytes":512,
        "url":"https://example.test/model.zip",
        "parts":[{"path":"TextEncoder.mlmodelc/model.mil","bytes":12,"sha256":"\(digest)"}]
      }
      """

    let manifest = try DistributionManifest.decode(Data(json.utf8))

    XCTAssertEqual(manifest.modelVersion, "1.0.1-coreml.1")
    XCTAssertEqual(manifest.selectedDelegate, "ANE")
  }

  func testManifestRejectsWrongRuntimeAndModelVersion() throws {
    let json = """
      {
        "manifestVersion":"1.0",
        "modelId":"lcm-sd15-chibi",
        "modelVersion":"1.0.1-coreml.1",
        "runtime":"onnxruntime-android",
        "runtimeVersion":"1.27.0",
        "quantization":"palettized-4bit",
        "supportedDelegates":["ANE"],
        "selectedDelegate":"ANE",
        "minimumMemoryMb":4096,
        "minimumStorageBytes":1024,
        "artifactBytes":512,
        "artifactSha256":"abc",
        "uncompressedBytes":256,
        "url":"https://example.test/model.zip",
        "parts":[]
      }
      """

    XCTAssertThrowsError(try DistributionManifest.decode(Data(json.utf8)))
  }
}
