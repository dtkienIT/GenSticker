package expo.modules.stickerruntime

import org.junit.Assert.assertEquals
import org.junit.Test

class DistributionManifestTest {
  private val canonicalDigest =
    "10172cfa9774dc7e0b7c8b0efa6854bc3b51307f308e4738a3869c07d0fe0cfd"

  @Test
  fun `parse accepts the canonical digest of ordered part metadata`() {
    val manifest = DistributionManifest.parse(json(canonicalDigest))

    assertEquals(canonicalDigest, manifest.artifactSha256)
  }

  @Test(expected = IllegalArgumentException::class)
  fun `parse rejects a canonical bundle digest mismatch`() {
    DistributionManifest.parse(json("0".repeat(64)))
  }

  @Test
  fun `canonical strings match Python json dumps escaping`() {
    assertEquals(
      "\"https://example.test/models/text_encoder/model.onnx\"",
      PythonCanonicalJson.quote("https://example.test/models/text_encoder/model.onnx"),
    )
    assertEquals(
      "\"model-\\u00e9\\ud83d\\ude00\"",
      PythonCanonicalJson.quote("model-é😀"),
    )
  }

  private fun json(digest: String) =
    """
      {
        "modelId":"lcm-sd15-chibi",
        "modelVersion":"1.0.0",
        "artifactSha256":"$digest",
        "artifactBytes":3,
        "minimumStorageBytes":6,
        "minimumMemoryMb":6144,
        "parts":[{
          "name":"clip",
          "path":"text_encoder/model.onnx",
          "bytes":3,
          "sha256":"abc",
          "url":"https://example.test/clip"
        }]
      }
    """.trimIndent()
}
