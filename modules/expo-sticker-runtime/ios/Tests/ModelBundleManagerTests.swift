import XCTest
import ZIPFoundation
@testable import ExpoStickerRuntimeCore

final class ModelBundleManagerTests: XCTestCase {
  func testCorruptInternalFileDoesNotReplaceReadyBundle() throws {
    let files = FileManager.default
    let temporary = files.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    let support = temporary.appendingPathComponent("support")
    let source = temporary.appendingPathComponent("source")
    try files.createDirectory(at: source, withIntermediateDirectories: true)
    try Data("model".utf8).write(to: source.appendingPathComponent("model.bin"))
    let archive = temporary.appendingPathComponent("model.zip")
    try files.zipItem(at: source, to: archive, shouldKeepParent: false)
    defer { try? files.removeItem(at: temporary) }

    let manager = ModelBundleManager(
      fileManager: files,
      applicationSupport: support,
      bundledManifestURL: nil
    )
    try files.createDirectory(at: manager.readyURL, withIntermediateDirectories: true)
    let sentinel = manager.readyURL.appendingPathComponent("sentinel")
    try Data("previous-valid-bundle".utf8).write(to: sentinel)
    let archiveBytes = Int64(try archive.resourceValues(forKeys: [.fileSizeKey]).fileSize!)
    let manifest = DistributionManifest(
      manifestVersion: "1.0",
      modelId: "lcm-sd15-chibi",
      modelVersion: "1.0.1-coreml.1",
      runtime: "coreml-ios",
      runtimeVersion: "ios-17",
      quantization: "palettized-4bit",
      supportedDelegates: ["ANE"],
      selectedDelegate: "ANE",
      minimumMemoryMb: 4_096,
      minimumStorageBytes: archiveBytes,
      artifactBytes: archiveBytes,
      artifactSha256: ModelBundleManager.sha256(archive)!,
      uncompressedBytes: 5,
      url: "https://example.test/model.zip",
      parts: [
        .init(path: "model.bin", bytes: 5, sha256: String(repeating: "0", count: 64))
      ]
    )

    XCTAssertThrowsError(try manager.installLocal(archive, manifest: manifest) { _, _, _ in })
    XCTAssertEqual(try String(contentsOf: sentinel, encoding: .utf8), "previous-valid-bundle")
  }
}
