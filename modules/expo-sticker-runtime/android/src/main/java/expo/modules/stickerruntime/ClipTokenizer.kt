package expo.modules.stickerruntime

import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.text.Normalizer

internal class ClipTokenizer private constructor(
  private val vocab: Map<String, Long>,
  private val mergeRanks: Map<Pair<String, String>, Int>,
) {
  fun encode(text: String): LongArray {
    val content = TOKEN_PATTERN.findAll(normalize(text))
      .flatMap { match -> bpe(byteEncode(match.value)).asSequence() }
      .map { token -> vocab[token] ?: END_TOKEN }
      .take(MAX_LENGTH - 2)
      .toList()
    return LongArray(MAX_LENGTH) { END_TOKEN }.also { output ->
      output[0] = START_TOKEN
      content.forEachIndexed { index, token -> output[index + 1] = token }
      output[content.size + 1] = END_TOKEN
    }
  }

  private fun bpe(token: String): List<String> {
    if (token.isEmpty()) return emptyList()
    val pieces = token.mapIndexed { index, character ->
      character.toString() + if (index == token.lastIndex) "</w>" else ""
    }.toMutableList()
    while (pieces.size > 1) {
      val candidate = pieces.zipWithNext()
        .mapIndexedNotNull { index, pair ->
          mergeRanks[pair]?.let { rank -> Triple(index, rank, pair) }
        }
        .minByOrNull { it.second }
        ?: break
      val merged = candidate.third.first + candidate.third.second
      pieces[candidate.first] = merged
      pieces.removeAt(candidate.first + 1)
    }
    return pieces
  }

  private fun byteEncode(token: String): String = buildString {
    token.toByteArray(StandardCharsets.UTF_8).forEach { byte ->
      append(BYTE_ENCODER[byte.toInt() and 0xff])
    }
  }

  companion object {
    private const val MAX_LENGTH = 77
    private const val START_TOKEN = 49406L
    private const val END_TOKEN = 49407L
    private val TOKEN_PATTERN = Regex(
      """<\|startoftext\|>|<\|endoftext\|>|'s|'t|'re|'ve|'m|'ll|'d|[\p{L}]+|[\p{N}]|[^\s\p{L}\p{N}]+""",
    )
    private val BYTE_ENCODER: Map<Int, Char> = buildByteEncoder()

    fun fromJson(json: String): ClipTokenizer {
      val model = JSONObject(json).getJSONObject("model")
      val rawVocab = model.getJSONObject("vocab")
      val vocab = rawVocab.keys().asSequence().associateWith { rawVocab.getLong(it) }
      val rawMerges = model.getJSONArray("merges")
      val ranks = buildMap {
        repeat(rawMerges.length()) { rank ->
          val merge = rawMerges.getJSONArray(rank)
          put(merge.getString(0) to merge.getString(1), rank)
        }
      }
      require(vocab["<|startoftext|>"] == START_TOKEN)
      require(vocab["<|endoftext|>"] == END_TOKEN)
      return ClipTokenizer(vocab, ranks)
    }

    private fun normalize(text: String): String =
      Normalizer.normalize(text, Normalizer.Form.NFC)
        .replace(Regex("""\s+"""), " ")
        .trim()
        .lowercase()

    private fun buildByteEncoder(): Map<Int, Char> {
      val direct = ((33..126) + (161..172) + (174..255)).toMutableList()
      val characters = direct.map(Int::toChar).toMutableList()
      var extra = 0
      for (byte in 0..255) {
        if (byte !in direct) {
          direct += byte
          characters += (256 + extra).toChar()
          extra += 1
        }
      }
      return direct.zip(characters).toMap()
    }
  }
}
