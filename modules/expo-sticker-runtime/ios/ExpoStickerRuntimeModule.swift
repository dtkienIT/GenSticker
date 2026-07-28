import Darwin
import ExpoModulesCore
import Foundation
import UIKit

public final class ExpoStickerRuntimeModule: Module {
  private let bundles = ModelBundleManager()
  private let generationLock = NSLock()
  private var activeRequest: (id: String, cancellation: GenerationCancellation)?

  public func definition() -> ModuleDefinition {
    Name("ExpoStickerRuntime")
    Events("onModelDownloadProgress", "onGenerationProgress")

    AsyncFunction("getCapabilities") { () -> [String: Any] in
      self.capabilities()
    }

    AsyncFunction("getModelBundleState") { () -> [String: Any] in
      self.bundleState()
    }

    AsyncFunction("startModelDownload") { () async -> [String: Any] in
      do {
        let manifest = try self.bundles.loadManifest()
        try await self.bundles.downloadAndPromote(manifest) { phase, downloaded, total in
          self.sendEvent("onModelDownloadProgress", [
            "phase": phase,
            "downloadedBytes": downloaded,
            "totalBytes": total,
          ])
        }
        return self.state("ready", manifest: manifest)
      } catch {
        return self.failedState(error)
      }
    }

    AsyncFunction("installLocalModel") { () -> [String: Any] in
      #if DEBUG
      do {
        let manifest = try self.bundles.loadManifest()
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let archive = documents.appendingPathComponent(
          "lcm-sd15-chibi-coreml-ios-v1.0.1.zip"
        )
        guard FileManager.default.fileExists(atPath: archive.path) else {
          return self.state(
            "failed",
            manifest: manifest,
            errorCode: "LOCAL_MODEL_NOT_STAGED"
          )
        }
        try self.bundles.installLocal(archive, manifest: manifest) { phase, downloaded, total in
          self.sendEvent("onModelDownloadProgress", [
            "phase": phase,
            "downloadedBytes": downloaded,
            "totalBytes": total,
          ])
        }
        return self.state("ready", manifest: manifest)
      } catch {
        return self.failedState(error)
      }
      #else
      return self.state("failed", errorCode: "LOCAL_MODEL_NOT_STAGED")
      #endif
    }

    AsyncFunction("cancelModelDownload") { () -> [String: Any] in
      self.bundles.cancelDownload()
      return self.state("missing")
    }

    AsyncFunction("prepareModel") { (request: [String: Any]) -> [String: Any] in
      let requestedId = request["modelId"] as? String ?? ""
      let requestedVersion = request["modelVersion"] as? String ?? ""
      guard let manifest = try? self.bundles.loadManifest(),
        requestedId == manifest.modelId,
        ["1.0.1", manifest.modelVersion].contains(requestedVersion),
        self.bundles.isReady(manifest)
      else {
        return [
          "contractVersion": "1.0",
          "modelId": requestedId,
          "modelVersion": requestedVersion,
          "ready": false,
          "errorCode": "MODEL_NOT_AVAILABLE",
        ]
      }
      return [
        "contractVersion": "1.0",
        "modelId": manifest.modelId,
        "modelVersion": manifest.modelVersion,
        "ready": true,
      ]
    }

    AsyncFunction("generate") { (request: [String: Any]) throws -> [String: Any] in
      let parsed = try self.parseGenerationRequest(request)
      let cancellation = GenerationCancellation()
      guard self.register(parsed.requestId, cancellation: cancellation) else {
        throw NSError(
          domain: "GENERATION_BUSY",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "GENERATION_BUSY"]
        )
      }
      let started = Date()
      var sequence = 0
      var terminal = false
      defer { self.unregister(parsed.requestId) }
      do {
        let manifest = try self.bundles.loadManifest()
        guard self.bundles.isReady(manifest) else {
          throw StickerRuntimeError.modelNotAvailable
        }
        let engine = StickerInferenceEngine(
          modelRoot: self.bundles.readyURL,
          cacheDirectory: FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        )
        let output = try engine.generate(parsed, cancellation: cancellation) { stage, value in
          guard !terminal else { return }
          sequence += 1
          self.sendEvent("onGenerationProgress", [
            "contractVersion": "1.0",
            "requestId": parsed.requestId,
            "sequence": sequence,
            "stage": stage,
            "stageProgress": value,
            "elapsedMs": Int(Date().timeIntervalSince(started) * 1_000),
          ])
        }
        terminal = true
        return [
          "requestId": parsed.requestId,
          "localUri": output.absoluteString,
          "mimeType": "image/png",
          "width": 512,
          "height": 512,
          "adapterId": "expo-sticker-runtime-coreml",
          "temporary": true,
        ]
      } catch {
        terminal = true
        let output = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
          .appendingPathComponent("generated-stickers/\(parsed.requestId).png")
        try? FileManager.default.removeItem(at: output)
        let code = error is GenerationCancellationError
          ? "GENERATION_CANCELLED"
          : (error as? StickerRuntimeError)?.code ?? "INFERENCE_FAILED"
        throw NSError(
          domain: code,
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "\(code): \(error.localizedDescription)"]
        )
      }
    }

    AsyncFunction("cancel") { (requestId: String) -> [String: Any] in
      self.generationLock.lock()
      let active = self.activeRequest
      self.generationLock.unlock()
      let accepted = active?.id == requestId && active?.cancellation.cancel() == true
      return [
        "accepted": accepted,
        "outcome": accepted ? "cancellation_requested" : "not_found",
      ]
    }
  }

  private func capabilities() -> [String: Any] {
    let simulator = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] != nil
    let memoryMb = Int(ProcessInfo.processInfo.physicalMemory / 1_048_576)
    let decision = RuntimePolicy.evaluate(
      isSimulator: simulator,
      machineIdentifier: machineIdentifier(),
      operatingSystemMajor: ProcessInfo.processInfo.operatingSystemVersion.majorVersion,
      physicalMemoryMb: memoryMb
    )
    if decision.supported {
      return [
        "supported": true,
        "adapterId": "expo-sticker-runtime-coreml",
        "totalMemoryClassMb": memoryMb,
        "deviceKind": "physical",
        "architecture": decision.architecture,
        "availableDelegates": ["ANE", "GPU", "CPU"],
        "selectedDelegate": "ANE",
        "runtimeVersion": "ios-17",
      ]
    }
    return [
      "supported": false,
      "reasonCode": decision.reasonCode ?? "DEVICE_UNSUPPORTED",
      "deviceKind": simulator ? "emulator" : "physical",
      "architecture": decision.architecture,
    ]
  }

  private func parseGenerationRequest(_ request: [String: Any]) throws -> StickerGenerationRequest {
    guard request["contractVersion"] as? String == "1.0",
      request["stylePresetId"] as? String == "chibi",
      (request["outputWidth"] as? NSNumber)?.intValue == 512,
      (request["outputHeight"] as? NSNumber)?.intValue == 512,
      let requestId = request["requestId"] as? String,
      !requestId.isEmpty,
      let prompt = request["prompt"] as? String,
      !prompt.isEmpty,
      let seed = (request["seed"] as? NSNumber)?.int64Value
    else {
      throw StickerRuntimeError.invalidRequest
    }
    return StickerGenerationRequest(requestId: requestId, prompt: prompt, seed: seed)
  }

  private func register(_ id: String, cancellation: GenerationCancellation) -> Bool {
    generationLock.lock()
    defer { generationLock.unlock() }
    guard activeRequest == nil else { return false }
    activeRequest = (id, cancellation)
    return true
  }

  private func unregister(_ id: String) {
    generationLock.lock()
    defer { generationLock.unlock() }
    if activeRequest?.id == id { activeRequest = nil }
  }

  private func bundleState() -> [String: Any] {
    do {
      let manifest = try bundles.loadManifest()
      try bundles.recoverCompletedDownload(manifest)
      return state(bundles.isReady(manifest) ? "ready" : "missing", manifest: manifest)
    } catch {
      return failedState(error)
    }
  }

  private func failedState(_ error: Error) -> [String: Any] {
    let code = (error as? ModelBundleError)?.code ?? "MODEL_PROMOTION_FAILED"
    return state("failed", errorCode: code)
  }

  private func state(
    _ status: String,
    manifest: DistributionManifest? = nil,
    errorCode: String? = nil
  ) -> [String: Any] {
    let resolved = manifest ?? (try? bundles.loadManifest())
    var value: [String: Any] = [
      "status": status,
      "modelId": resolved?.modelId ?? "lcm-sd15-chibi",
      "modelVersion": resolved?.modelVersion ?? "1.0.1-coreml.1",
      "downloadedBytes": status == "ready" ? (resolved?.artifactBytes ?? 0) : 0,
      "totalBytes": resolved?.artifactBytes ?? 0,
    ]
    if let errorCode { value["errorCode"] = errorCode }
    return value
  }

  private func machineIdentifier() -> String {
    var systemInfo = utsname()
    uname(&systemInfo)
    return withUnsafePointer(to: &systemInfo.machine) {
      $0.withMemoryRebound(to: CChar.self, capacity: 1) { String(cString: $0) }
    }
  }
}
