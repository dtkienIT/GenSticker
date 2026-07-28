#if canImport(UIKit)
import CoreImage
import CoreGraphics
import CoreML
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

enum StickerRuntimeError: Error {
  case invalidRequest
  case modelNotAvailable
  case generationCancelled
  case inferenceFailed(String)
  case segmentationFailed
  case assetEncodingFailed

  var code: String {
    switch self {
    case .invalidRequest: return "INVALID_REQUEST"
    case .modelNotAvailable: return "MODEL_NOT_AVAILABLE"
    case .generationCancelled: return "GENERATION_CANCELLED"
    case .inferenceFailed: return "INFERENCE_FAILED"
    case .segmentationFailed: return "SEGMENTATION_FAILED"
    case .assetEncodingFailed: return "ASSET_ENCODING_FAILED"
    }
  }
}

struct StickerGenerationRequest {
  let requestId: String
  let prompt: String
  let seed: Int64
}

final class StickerInferenceEngine {
  private static let width = 512
  private static let height = 512
  private static let latentSize = 4 * 64 * 64
  private static let latentScale: Float = 0.18215
  private static let guidance: Float = 1.5
  private static let negativePrompt =
    "photorealistic, text, watermark, gore, explicit content"
  private static let promptSuffix =
    "chibi sticker, bold clean outline, centered subject"

  private let modelRoot: URL
  private let outputRoot: URL

  init(modelRoot: URL, cacheDirectory: URL) {
    self.modelRoot = modelRoot
    outputRoot = cacheDirectory.appendingPathComponent("generated-stickers", isDirectory: true)
  }

  func generate(
    _ request: StickerGenerationRequest,
    cancellation: GenerationCancellation,
    progress: (_ stage: String, _ value: Double) -> Void
  ) throws -> URL {
    try cancellation.check()
    progress("validating", 1)
    let tokenizerURL = modelRoot.appendingPathComponent("tokenizer/tokenizer.json")
    guard let tokenizerJSON = try? String(contentsOf: tokenizerURL, encoding: .utf8) else {
      throw StickerRuntimeError.modelNotAvailable
    }
    let tokenizer = try ClipTokenizer.fromJSON(tokenizerJSON)
    let configuration = MLModelConfiguration()
    configuration.computeUnits = .cpuAndNeuralEngine
    var textEncoder: MLModel? = try loadModel(
      named: ["TextEncoder", "text_encoder"],
      configuration
    )
    let hiddenStates = try encodeText(
      tokenizer: tokenizer,
      model: textEncoder!,
      prompt: "\(request.prompt), \(Self.promptSuffix)",
      cancellation: cancellation
    )
    textEncoder = nil
    progress("preparing_model", 0.34)
    var unetModels: [MLModel]? = try loadUnet(configuration)
    progress("preparing_model", 0.67)
    var latents = SeededLatents.gaussian(seed: request.seed, count: Self.latentSize)
    let noiseSeed = request.seed ^ 0x4c434d
    let stepNoise = SeededLatents.gaussian(seed: noiseSeed, count: Self.latentSize * 4)
    let timesteps = try LcmScheduler.timesteps(inferenceSteps: 4)
    for stepIndex in 0..<4 {
      try cancellation.check()
      let batched = latents + latents
      let output = try predictUnet(
        models: unetModels!,
        latents: batched,
        timestep: Float(timesteps[stepIndex]),
        hiddenStates: hiddenStates,
        cancellation: cancellation
      )
      let guided = try TensorMath.guidedNoise(
        output,
        batchElementSize: Self.latentSize,
        guidance: Self.guidance
      )
      latents = try (0..<Self.latentSize).map { index in
        try LcmScheduler.step(
          sample: latents[index],
          modelOutput: guided[index],
          noise: stepNoise[stepIndex * Self.latentSize + index],
          stepIndex: stepIndex
        )
      }
      progress("generating", Double(stepIndex + 1) / 4)
    }
    unetModels = nil
    try cancellation.check()
    progress("preparing_model", 1)
    let decoder = try loadModel(named: ["VAEDecoder", "vae_decoder"], configuration)
    let decoded = try predict(
      decoder,
      values: [
        "latent_sample": try multiArray(
          latents.map { $0 / Self.latentScale },
          shape: [1, 4, 64, 64]
        )
      ],
      cancellation: cancellation
    )
    let rgba = try TensorMath.decodedRGBA(
      floats(from: decoded),
      width: Self.width,
      height: Self.height
    )
    guard let opaqueImage = makeImage(rgba: rgba, width: Self.width, height: Self.height) else {
      throw StickerRuntimeError.assetEncodingFailed
    }
    progress("removing_background", 0)
    let transparentImage = try foregroundImage(opaqueImage, cancellation: cancellation)
    progress("removing_background", 1)
    try cancellation.check()
    progress("encoding", 0)
    try FileManager.default.createDirectory(at: outputRoot, withIntermediateDirectories: true)
    let output = outputRoot.appendingPathComponent("\(request.requestId).png")
    do {
      try writePNG(transparentImage, to: output)
    } catch {
      try? FileManager.default.removeItem(at: output)
      throw error
    }
    progress("encoding", 1)
    try cancellation.check()
    progress("completed", 1)
    return output
  }

  private func encodeText(
    tokenizer: ClipTokenizer,
    model: MLModel,
    prompt: String,
    cancellation: GenerationCancellation
  ) throws -> [Float] {
    let tokens = tokenizer.encode(Self.negativePrompt) + tokenizer.encode(prompt)
    let input = try MLMultiArray(shape: [2, 77], dataType: .int32)
    for (index, token) in tokens.enumerated() { input[index] = NSNumber(value: token) }
    return floats(from: try predict(
      model,
      values: ["input_ids": input],
      cancellation: cancellation
    ))
  }

  private func predictUnet(
    models: [MLModel],
    latents: [Float],
    timestep: Float,
    hiddenStates: [Float],
    cancellation: GenerationCancellation
  ) throws -> [Float] {
    var values: [String: MLMultiArray] = [
      "sample": try multiArray(latents, shape: [2, 4, 64, 64]),
      "timestep": try multiArray([timestep, timestep], shape: [2]),
      "encoder_hidden_states": try multiArray(hiddenStates, shape: [2, 77, 768]),
    ]
    var output: MLFeatureProvider?
    for model in models {
      try cancellation.check()
      output = try prediction(model, arrays: values)
      try cancellation.check()
      for name in output?.featureNames ?? [] {
        if let array = output?.featureValue(for: name)?.multiArrayValue {
          values[name] = array
        }
      }
    }
    guard let output else { throw StickerRuntimeError.inferenceFailed("UNet returned no output") }
    return floats(from: output)
  }

  private func predict(
    _ model: MLModel,
    values: [String: MLMultiArray],
    cancellation: GenerationCancellation
  ) throws -> MLFeatureProvider {
    try cancellation.check()
    let output = try prediction(model, arrays: values)
    try cancellation.check()
    return output
  }

  private func prediction(
    _ model: MLModel,
    arrays: [String: MLMultiArray]
  ) throws -> MLFeatureProvider {
    let expected = model.modelDescription.inputDescriptionsByName.keys
    let dictionary: [String: Any] = Dictionary(
      uniqueKeysWithValues: arrays.compactMap { name, value in
        expected.contains(name) ? (name, MLFeatureValue(multiArray: value)) : nil
      }
    )
    do {
      return try model.prediction(from: MLDictionaryFeatureProvider(dictionary: dictionary))
    } catch {
      throw StickerRuntimeError.inferenceFailed(error.localizedDescription)
    }
  }

  private func loadUnet(_ configuration: MLModelConfiguration) throws -> [MLModel] {
    if let single = try? loadModel(named: ["Unet", "UNet", "unet"], configuration) {
      return [single]
    }
    return [
      try loadModel(named: ["UnetChunk1", "UNetChunk1"], configuration),
      try loadModel(named: ["UnetChunk2", "UNetChunk2"], configuration),
    ]
  }

  private func loadModel(
    named names: [String],
    _ configuration: MLModelConfiguration
  ) throws -> MLModel {
    for name in names {
      let candidates = [
        modelRoot.appendingPathComponent("models/\(name).mlmodelc"),
        modelRoot.appendingPathComponent("\(name).mlmodelc"),
      ]
      for candidate in candidates where FileManager.default.fileExists(atPath: candidate.path) {
        do { return try MLModel(contentsOf: candidate, configuration: configuration) }
        catch { throw StickerRuntimeError.inferenceFailed(error.localizedDescription) }
      }
    }
    throw StickerRuntimeError.modelNotAvailable
  }

  private func multiArray(_ values: [Float], shape: [NSNumber]) throws -> MLMultiArray {
    let array = try MLMultiArray(shape: shape, dataType: .float32)
    guard array.count == values.count else { throw StickerRuntimeError.inferenceFailed("Tensor shape") }
    for (index, value) in values.enumerated() { array[index] = NSNumber(value: value) }
    return array
  }

  private func floats(from provider: MLFeatureProvider) -> [Float] {
    for name in provider.featureNames {
      if let array = provider.featureValue(for: name)?.multiArrayValue {
        return (0..<array.count).map { array[$0].floatValue }
      }
    }
    return []
  }

  private func makeImage(rgba: [UInt8], width: Int, height: Int) -> CGImage? {
    guard let provider = CGDataProvider(data: Data(rgba) as CFData) else { return nil }
    return CGImage(
      width: width,
      height: height,
      bitsPerComponent: 8,
      bitsPerPixel: 32,
      bytesPerRow: width * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue),
      provider: provider,
      decode: nil,
      shouldInterpolate: false,
      intent: .defaultIntent
    )
  }

  private func foregroundImage(
    _ image: CGImage,
    cancellation: GenerationCancellation
  ) throws -> CGImage {
    try cancellation.check()
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: image)
    try handler.perform([request])
    try cancellation.check()
    guard let observation = request.results?.first else {
      throw StickerRuntimeError.segmentationFailed
    }
    let mask = try observation.generateScaledMaskForImage(
      forInstances: observation.allInstances,
      from: handler
    )
    let source = CIImage(cgImage: image)
    let transparent = CIImage(color: .clear).cropped(to: source.extent)
    let masked = source.applyingFilter(
      "CIBlendWithAlphaMask",
      parameters: [
        kCIInputBackgroundImageKey: transparent,
        kCIInputMaskImageKey: CIImage(cvPixelBuffer: mask),
      ]
    )
    guard let result = CIContext().createCGImage(masked, from: source.extent) else {
      throw StickerRuntimeError.segmentationFailed
    }
    return result
  }

  private func writePNG(_ image: CGImage, to url: URL) throws {
    guard let destination = CGImageDestinationCreateWithURL(
      url as CFURL,
      UTType.png.identifier as CFString,
      1,
      nil
    ) else {
      throw StickerRuntimeError.assetEncodingFailed
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else {
      throw StickerRuntimeError.assetEncodingFailed
    }
  }
}
#endif
