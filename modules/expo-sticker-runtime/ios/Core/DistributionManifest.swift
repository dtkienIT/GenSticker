import Foundation

struct DistributionManifest: Codable, Equatable {
  struct Part: Codable, Equatable {
    let path: String
    let bytes: Int64
    let sha256: String
  }

  let manifestVersion: String
  let modelId: String
  let modelVersion: String
  let runtime: String
  let runtimeVersion: String
  let quantization: String
  let supportedDelegates: [String]
  let selectedDelegate: String
  let minimumMemoryMb: Int
  let minimumStorageBytes: Int64
  let artifactBytes: Int64
  let artifactSha256: String
  let uncompressedBytes: Int64
  let url: String
  let parts: [Part]

  static func decode(_ data: Data) throws -> DistributionManifest {
    let manifest = try JSONDecoder().decode(DistributionManifest.self, from: data)
    guard manifest.manifestVersion == "1.0",
      manifest.modelId == "lcm-sd15-chibi",
      manifest.modelVersion == "1.0.1-coreml.1",
      manifest.runtime == "coreml-ios",
      manifest.selectedDelegate == "ANE",
      manifest.supportedDelegates.contains("ANE"),
      manifest.artifactBytes > 0,
      manifest.minimumStorageBytes >= manifest.artifactBytes,
      URL(string: manifest.url)?.scheme == "https",
      !manifest.parts.isEmpty,
      isSHA256(manifest.artifactSha256),
      manifest.parts.allSatisfy({
        isSafeArchivePath($0.path) && $0.bytes >= 0 && isSHA256($0.sha256)
      })
    else {
      throw RuntimeCoreError.invalidManifest("Unsupported or incomplete distribution manifest")
    }
    return manifest
  }

  static func isSafeArchivePath(_ path: String) -> Bool {
    guard !path.isEmpty, !path.hasPrefix("/"), !path.hasPrefix("\\") else {
      return false
    }
    let normalized = path.replacingOccurrences(of: "\\", with: "/")
    let segments = normalized.split(separator: "/", omittingEmptySubsequences: false)
    return !segments.contains(where: { $0.isEmpty || $0 == "." || $0 == ".." })
      && !normalized.contains(":")
  }

  private static func isSHA256(_ value: String) -> Bool {
    value.range(of: #"^[0-9a-fA-F]{64}$"#, options: .regularExpression) != nil
  }
}
