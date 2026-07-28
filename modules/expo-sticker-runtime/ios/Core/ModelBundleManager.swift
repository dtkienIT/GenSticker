import CryptoKit
import Foundation
import ZIPFoundation

enum ModelBundleError: Error {
  case manifestMissing
  case insufficientStorage
  case downloadCancelled
  case downloadFailed(String)
  case checksumMismatch
  case promotionFailed(String)

  var code: String {
    switch self {
    case .manifestMissing: return "MODEL_MANIFEST_MISSING"
    case .insufficientStorage: return "INSUFFICIENT_STORAGE"
    case .downloadCancelled: return "DOWNLOAD_CANCELLED"
    case .downloadFailed: return "DOWNLOAD_FAILED"
    case .checksumMismatch: return "CHECKSUM_MISMATCH"
    case .promotionFailed: return "MODEL_PROMOTION_FAILED"
    }
  }
}

final class ModelBundleManager {
  typealias Progress = (_ phase: String, _ downloaded: Int64, _ total: Int64) -> Void

  private let fileManager: FileManager
  private let root: URL
  private let bundledManifestURL: URL?
  private let downloads: BackgroundModelDownload

  init(
    fileManager: FileManager = .default,
    applicationSupport: URL? = nil,
    bundledManifestURL: URL? = Bundle.main.url(
      forResource: "model-distribution.manifest",
      withExtension: "json"
    )
  ) {
    self.fileManager = fileManager
    let support = applicationSupport ?? fileManager.urls(
      for: .applicationSupportDirectory,
      in: .userDomainMask
    )[0]
    root = support.appendingPathComponent("sticker-model", isDirectory: true)
    self.bundledManifestURL = bundledManifestURL
    downloads = BackgroundModelDownload.shared
  }

  var readyURL: URL {
    root.appendingPathComponent("ready", isDirectory: true)
  }

  func loadManifest() throws -> DistributionManifest {
    guard let bundledManifestURL else {
      throw ModelBundleError.manifestMissing
    }
    return try DistributionManifest.decode(Data(contentsOf: bundledManifestURL))
  }

  func hasEnoughStorage(for manifest: DistributionManifest) -> Bool {
    let values = try? root.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
    return Int64(values?.volumeAvailableCapacityForImportantUsage ?? 0)
      >= manifest.minimumStorageBytes
  }

  func isReady(_ manifest: DistributionManifest) -> Bool {
    let marker = readyURL.appendingPathComponent(".bundle-\(manifest.artifactSha256)")
    guard fileManager.fileExists(atPath: marker.path) else { return false }
    return manifest.parts.allSatisfy { part in
      verify(readyURL.appendingPathComponent(part.path), part: part)
    }
  }

  func recoverCompletedDownload(_ manifest: DistributionManifest) throws {
    let archive = BackgroundModelDownload.completedArchiveURL
    guard fileManager.fileExists(atPath: archive.path) else { return }
    defer { try? fileManager.removeItem(at: archive) }
    guard Self.sha256(archive) == manifest.artifactSha256.lowercased() else {
      throw ModelBundleError.checksumMismatch
    }
    try promoteArchive(archive, manifest: manifest)
  }

  func downloadAndPromote(
    _ manifest: DistributionManifest,
    progress: @escaping Progress
  ) async throws {
    guard hasEnoughStorage(for: manifest) else {
      throw ModelBundleError.insufficientStorage
    }
    try fileManager.createDirectory(at: root, withIntermediateDirectories: true)
    let archive = root.appendingPathComponent("download-\(manifest.artifactSha256).zip")
    if fileManager.fileExists(atPath: archive.path) {
      try fileManager.removeItem(at: archive)
    }
    let temporary = try await downloads.download(
      from: try validatedRemoteURL(manifest.url),
      expectedBytes: manifest.artifactBytes,
      progress: { progress("downloading", $0, $1) }
    )
    do {
      try fileManager.moveItem(at: temporary, to: archive)
      progress("verifying", manifest.artifactBytes, manifest.artifactBytes)
      guard Self.sha256(archive) == manifest.artifactSha256.lowercased() else {
        throw ModelBundleError.checksumMismatch
      }
      try promoteArchive(archive, manifest: manifest)
      try? fileManager.removeItem(at: archive)
    } catch {
      try? fileManager.removeItem(at: archive)
      throw error
    }
  }

  func installLocal(
    _ archive: URL,
    manifest: DistributionManifest,
    progress: Progress
  ) throws {
    progress("verifying", 0, manifest.artifactBytes)
    guard Self.sha256(archive) == manifest.artifactSha256.lowercased() else {
      throw ModelBundleError.checksumMismatch
    }
    try promoteArchive(archive, manifest: manifest)
    progress("verifying", manifest.artifactBytes, manifest.artifactBytes)
  }

  func cancelDownload() {
    downloads.cancel()
    try? fileManager.removeItem(at: BackgroundModelDownload.completedArchiveURL)
  }

  private func promoteArchive(_ archiveURL: URL, manifest: DistributionManifest) throws {
    let staging = root.appendingPathComponent("staging-\(UUID().uuidString)", isDirectory: true)
    let previous = root.appendingPathComponent("previous", isDirectory: true)
    do {
      try fileManager.createDirectory(at: staging, withIntermediateDirectories: true)
      let archive = try Archive(url: archiveURL, accessMode: .read)
      for entry in archive {
        guard DistributionManifest.isSafeArchivePath(entry.path) else {
          throw ModelBundleError.promotionFailed("Unsafe archive path")
        }
        guard entry.type != .symlink else {
          throw ModelBundleError.promotionFailed("Symbolic links are not permitted")
        }
        let destination = staging.appendingPathComponent(entry.path)
        guard destination.standardizedFileURL.path.hasPrefix(staging.standardizedFileURL.path + "/")
        else {
          throw ModelBundleError.promotionFailed("Archive path escaped staging")
        }
        try fileManager.createDirectory(
          at: destination.deletingLastPathComponent(),
          withIntermediateDirectories: true
        )
        _ = try archive.extract(entry, to: destination)
      }
      guard manifest.parts.allSatisfy({
        verify(staging.appendingPathComponent($0.path), part: $0)
      }) else {
        throw ModelBundleError.checksumMismatch
      }
      try Data(manifest.modelVersion.utf8).write(
        to: staging.appendingPathComponent(".bundle-\(manifest.artifactSha256)"),
        options: .atomic
      )
      try excludeFromBackup(staging)
      if fileManager.fileExists(atPath: previous.path) {
        try fileManager.removeItem(at: previous)
      }
      if fileManager.fileExists(atPath: readyURL.path) {
        _ = try fileManager.replaceItemAt(
          readyURL,
          withItemAt: staging,
          backupItemName: previous.lastPathComponent
        )
      } else {
        try fileManager.moveItem(at: staging, to: readyURL)
      }
      try? fileManager.removeItem(at: previous)
    } catch {
      try? fileManager.removeItem(at: staging)
      if let modelError = error as? ModelBundleError { throw modelError }
      throw ModelBundleError.promotionFailed(error.localizedDescription)
    }
  }

  private func verify(_ url: URL, part: DistributionManifest.Part) -> Bool {
    guard let values = try? url.resourceValues(forKeys: [.fileSizeKey]),
      Int64(values.fileSize ?? -1) == part.bytes
    else {
      return false
    }
    return Self.sha256(url) == part.sha256.lowercased()
  }

  private func excludeFromBackup(_ url: URL) throws {
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    var mutableURL = url
    try mutableURL.setResourceValues(values)
  }

  private func validatedRemoteURL(_ value: String) throws -> URL {
    guard let url = URL(string: value), url.scheme == "https" else {
      throw ModelBundleError.downloadFailed("Model URL must use HTTPS")
    }
    return url
  }

  static func sha256(_ url: URL) -> String? {
    guard let stream = InputStream(url: url) else { return nil }
    stream.open()
    defer { stream.close() }
    var hasher = SHA256()
    var buffer = [UInt8](repeating: 0, count: 1_048_576)
    while stream.hasBytesAvailable {
      let count = stream.read(&buffer, maxLength: buffer.count)
      if count < 0 { return nil }
      if count == 0 { break }
      hasher.update(data: Data(buffer[0..<count]))
    }
    return hasher.finalize().map { String(format: "%02x", $0) }.joined()
  }
}

final class BackgroundModelDownload: NSObject, URLSessionDownloadDelegate {
  static let shared = BackgroundModelDownload()
  static let sessionIdentifier = "com.vinai.gensticker.model-download"
  static var completedArchiveURL: URL {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("sticker-model/background-download.zip")
  }

  private var continuation: CheckedContinuation<URL, Error>?
  private var progress: ModelBundleManager.Progress?
  private var expectedBytes: Int64 = 0
  var backgroundCompletionHandler: (() -> Void)?
  private lazy var session = URLSession(
    configuration: URLSessionConfiguration.background(withIdentifier: Self.sessionIdentifier),
    delegate: self,
    delegateQueue: nil
  )

  func download(
    from url: URL,
    expectedBytes: Int64,
    progress: @escaping ModelBundleManager.Progress
  ) async throws -> URL {
    await cancelExistingTasks()
    try? FileManager.default.removeItem(at: Self.completedArchiveURL)
    self.progress = progress
    self.expectedBytes = expectedBytes
    return try await withCheckedThrowingContinuation { continuation in
      self.continuation = continuation
      session.downloadTask(with: url).resume()
    }
  }

  func cancel() {
    session.getAllTasks { tasks in tasks.forEach { $0.cancel() } }
  }

  func resumeBackgroundEvents() {
    _ = session
  }

  private func cancelExistingTasks() async {
    await withCheckedContinuation { continuation in
      session.getAllTasks { tasks in
        tasks.forEach { $0.cancel() }
        continuation.resume()
      }
    }
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didWriteData bytesWritten: Int64,
    totalBytesWritten: Int64,
    totalBytesExpectedToWrite: Int64
  ) {
    progress?(
      "downloading",
      totalBytesWritten,
      totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : expectedBytes
    )
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didFinishDownloadingTo location: URL
  ) {
    let retained = Self.completedArchiveURL
    do {
      try FileManager.default.createDirectory(
        at: retained.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      try? FileManager.default.removeItem(at: retained)
      try FileManager.default.moveItem(at: location, to: retained)
      if let continuation {
        continuation.resume(returning: retained)
        self.continuation = nil
      }
    } catch {
      continuation?.resume(throwing: ModelBundleError.downloadFailed(error.localizedDescription))
      continuation = nil
    }
  }

  func urlSession(
    _ session: URLSession,
    task: URLSessionTask,
    didCompleteWithError error: Error?
  ) {
    guard let error, continuation != nil else { return }
    let nsError = error as NSError
    continuation?.resume(
      throwing: nsError.code == NSURLErrorCancelled
        ? ModelBundleError.downloadCancelled
        : ModelBundleError.downloadFailed(error.localizedDescription)
    )
    continuation = nil
  }

  func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
    DispatchQueue.main.async {
      self.backgroundCompletionHandler?()
      self.backgroundCompletionHandler = nil
    }
  }
}
