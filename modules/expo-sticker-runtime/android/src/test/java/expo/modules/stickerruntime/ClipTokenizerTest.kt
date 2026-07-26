package expo.modules.stickerruntime

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class ClipTokenizerTest {
  @Test
  fun `encodes and pads pinned CLIP BPE fixture to 77 tokens`() {
    val tokenizer = ClipTokenizer.fromJson(
      """
        {
          "model": {
            "vocab": {
              "<|startoftext|>": 49406,
              "<|endoftext|>": 49407,
              "a</w>": 320,
              "cat</w>": 2368
            },
            "merges": [["a","t</w>"],["c","a"],["c","at</w>"]]
          }
        }
      """.trimIndent(),
    )

    val ids = tokenizer.encode("A CAT")

    assertEquals(77, ids.size)
    assertArrayEquals(longArrayOf(49406, 320, 2368, 49407), ids.copyOfRange(0, 4))
    assertEquals(49407, ids.last())
  }

  @Test
  fun `truncation always retains the end token`() {
    val tokenizer = ClipTokenizer.fromJson(
      """
        {"model":{"vocab":{"<|startoftext|>":49406,"<|endoftext|>":49407,"a</w>":320},"merges":[]}}
      """.trimIndent(),
    )

    val ids = tokenizer.encode(List(100) { "a" }.joinToString(" "))

    assertEquals(49406, ids.first())
    assertEquals(49407, ids.last())
    assertEquals(75, ids.count { it == 320L })
  }
}
