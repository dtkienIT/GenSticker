import Foundation

final class ClipTokenizer {
  private struct TokenizerFile: Decodable {
    struct Model: Decodable {
      let vocab: [String: Int32]
      let merges: [[String]]
    }
    let model: Model
  }

  private struct Pair: Hashable {
    let first: String
    let second: String
  }

  private static let maxLength = 77
  private static let startToken: Int32 = 49_406
  private static let endToken: Int32 = 49_407
  private static let byteEncoder = buildByteEncoder()
  private static let tokenPattern = try! NSRegularExpression(
    pattern: #"<\|startoftext\|>|<\|endoftext\|>|'s|'t|'re|'ve|'m|'ll|'d|[\p{L}]+|[\p{N}]|[^\s\p{L}\p{N}]+"#
  )

  private let vocab: [String: Int32]
  private let mergeRanks: [Pair: Int]

  private init(vocab: [String: Int32], mergeRanks: [Pair: Int]) {
    self.vocab = vocab
    self.mergeRanks = mergeRanks
  }

  static func fromJSON(_ json: String) throws -> ClipTokenizer {
    let file = try JSONDecoder().decode(TokenizerFile.self, from: Data(json.utf8))
    guard file.model.vocab["<|startoftext|>"] == startToken,
      file.model.vocab["<|endoftext|>"] == endToken
    else {
      throw RuntimeCoreError.invalidArgument("tokenizer")
    }
    let ranks = Dictionary(
      uniqueKeysWithValues: file.model.merges.enumerated().compactMap { rank, merge in
        guard merge.count == 2 else { return nil }
        return (Pair(first: merge[0], second: merge[1]), rank)
      }
    )
    return ClipTokenizer(vocab: file.model.vocab, mergeRanks: ranks)
  }

  func encode(_ text: String) -> [Int32] {
    let normalized = text.precomposedStringWithCanonicalMapping
      .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .lowercased()
    let range = NSRange(normalized.startIndex..<normalized.endIndex, in: normalized)
    var content: [Int32] = []
    for match in Self.tokenPattern.matches(in: normalized, range: range) {
      guard let tokenRange = Range(match.range, in: normalized) else { continue }
      content.append(
        contentsOf: bpe(byteEncode(String(normalized[tokenRange])))
          .map { vocab[$0] ?? Self.endToken }
      )
      if content.count >= Self.maxLength - 2 { break }
    }
    content = Array(content.prefix(Self.maxLength - 2))
    var output = [Int32](repeating: Self.endToken, count: Self.maxLength)
    output[0] = Self.startToken
    output.replaceSubrange(1..<(content.count + 1), with: content)
    output[content.count + 1] = Self.endToken
    return output
  }

  private func bpe(_ token: String) -> [String] {
    guard !token.isEmpty else { return [] }
    var pieces = token.enumerated().map { offset, character in
      String(character) + (offset == token.count - 1 ? "</w>" : "")
    }
    while pieces.count > 1 {
      var candidate: (index: Int, rank: Int)?
      for index in 0..<(pieces.count - 1) {
        guard let rank = mergeRanks[Pair(first: pieces[index], second: pieces[index + 1])]
        else { continue }
        if candidate == nil || rank < candidate!.rank {
          candidate = (index, rank)
        }
      }
      guard let candidate else { break }
      pieces[candidate.index] += pieces[candidate.index + 1]
      pieces.remove(at: candidate.index + 1)
    }
    return pieces
  }

  private func byteEncode(_ token: String) -> String {
    String(token.utf8.map { Self.byteEncoder[Int($0)]! })
  }

  private static func buildByteEncoder() -> [Int: Character] {
    var bytes = Array(33...126) + Array(161...172) + Array(174...255)
    var characters = bytes.compactMap(UnicodeScalar.init).map(Character.init)
    var extra = 0
    for byte in 0...255 where !bytes.contains(byte) {
      bytes.append(byte)
      characters.append(Character(UnicodeScalar(256 + extra)!))
      extra += 1
    }
    return Dictionary(uniqueKeysWithValues: zip(bytes, characters))
  }
}
