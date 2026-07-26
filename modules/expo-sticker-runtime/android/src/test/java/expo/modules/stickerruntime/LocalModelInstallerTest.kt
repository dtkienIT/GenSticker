package expo.modules.stickerruntime

import java.io.File
import java.security.MessageDigest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class LocalModelInstallerTest {
  @get:Rule
  val temporary = TemporaryFolder()

  @Test
  fun `verified import promotes bundle and removes staging`() {
    val root = temporary.newFolder("root")
    val staging = temporary.newFolder("staging")
    val source = File(staging, "tokenizer/tokenizer.json").also {
      requireNotNull(it.parentFile).mkdirs()
      it.writeText("verified")
    }
    val manifest = manifest(part("tokenizer/tokenizer.json", source))

    LocalModelInstaller(root, staging, availableBytes = { Long.MAX_VALUE }).install(manifest)

    assertEquals("verified", File(root, "ready/tokenizer/tokenizer.json").readText())
    assertTrue(File(root, "ready/.bundle-${manifest.artifactSha256}").isFile)
    assertFalse(staging.exists())
  }

  @Test
  fun `missing staged directory reports local model not staged`() {
    val root = temporary.newFolder("root")
    val staging = File(temporary.root, "missing")

    val error = runCatching {
      LocalModelInstaller(root, staging, availableBytes = { Long.MAX_VALUE }).install(manifest())
    }.exceptionOrNull() as LocalModelImportException

    assertEquals("LOCAL_MODEL_NOT_STAGED", error.code)
  }

  @Test
  fun `checksum failure preserves previous ready bundle and staging`() {
    val root = temporary.newFolder("root")
    File(root, "ready/keep.txt").also {
      requireNotNull(it.parentFile).mkdirs()
      it.writeText("keep")
    }
    val staging = temporary.newFolder("staging")
    val source = File(staging, "unet/model.onnx").also {
      requireNotNull(it.parentFile).mkdirs()
      it.writeText("corrupt")
    }
    val expected = ModelPart(
      name = "unet--model.onnx",
      path = "unet/model.onnx",
      bytes = source.length(),
      sha256 = sha256("expected"),
      url = "local",
    )

    val error = runCatching {
      LocalModelInstaller(root, staging, availableBytes = { Long.MAX_VALUE })
        .install(manifest(expected))
    }.exceptionOrNull() as LocalModelImportException

    assertEquals("MODEL_CHECKSUM_MISMATCH", error.code)
    assertTrue(error.message.orEmpty().contains("unet/model.onnx"))
    assertTrue(error.message.orEmpty().contains("expectedSha256="))
    assertTrue(error.message.orEmpty().contains("actualSha256="))
    assertEquals("keep", File(root, "ready/keep.txt").readText())
    assertTrue(source.isFile)
  }

  @Test
  fun `insufficient space leaves staged and ready files untouched`() {
    val root = temporary.newFolder("root")
    File(root, "ready/keep.txt").also {
      requireNotNull(it.parentFile).mkdirs()
      it.writeText("keep")
    }
    val staging = temporary.newFolder("staging")
    val source = File(staging, "vae_decoder/model.onnx").also {
      requireNotNull(it.parentFile).mkdirs()
      it.writeText("model")
    }

    val error = runCatching {
      LocalModelInstaller(root, staging, availableBytes = { 0L }).install(
        manifest(part("vae_decoder/model.onnx", source)),
      )
    }.exceptionOrNull() as LocalModelImportException

    assertEquals("INSUFFICIENT_STORAGE", error.code)
    assertEquals("keep", File(root, "ready/keep.txt").readText())
    assertTrue(source.isFile)
  }

  @Test
  fun `failed final promotion restores previous ready bundle`() {
    val root = temporary.newFolder("root")
    File(root, "ready/keep.txt").also {
      requireNotNull(it.parentFile).mkdirs()
      it.writeText("keep")
    }
    val staging = temporary.newFolder("staging")
    val source = File(staging, "text_encoder/model.onnx").also {
      requireNotNull(it.parentFile).mkdirs()
      it.writeText("model")
    }
    var renameCount = 0
    val installer = LocalModelInstaller(
      root = root,
      staging = staging,
      availableBytes = { Long.MAX_VALUE },
      rename = { from, to ->
        renameCount += 1
        if (renameCount == 2) false else from.renameTo(to)
      },
    )

    val error = runCatching {
      installer.install(manifest(part("text_encoder/model.onnx", source)))
    }.exceptionOrNull() as LocalModelImportException

    assertEquals("MODEL_PROMOTION_FAILED", error.code)
    assertEquals("keep", File(root, "ready/keep.txt").readText())
    assertTrue(source.isFile)
  }

  @Test
  fun `app private staging is selected when external parts are not visible`() {
    val external = temporary.newFolder("external")
    val internal = temporary.newFolder("internal")
    val visible = File(internal, "runtime-config.json").also { it.writeText("config") }
    val parts = listOf(part("runtime-config.json", visible))

    assertEquals(internal, LocalImportPaths.select(parts, external, internal))
  }

  private fun manifest(vararg parts: ModelPart): DistributionManifest =
    DistributionManifest(
      modelId = "lcm-sd15-chibi",
      modelVersion = "1.0.0",
      artifactSha256 = "bundle",
      artifactBytes = parts.sumOf(ModelPart::bytes),
      minimumStorageBytes = parts.sumOf(ModelPart::bytes),
      minimumMemoryMb = 6144,
      parts = parts.toList(),
    )

  private fun part(path: String, file: File): ModelPart =
    ModelPart(
      name = path.replace('/', '-'),
      path = path,
      bytes = file.length(),
      sha256 = sha256(file.readText()),
      url = "local",
    )

  private fun sha256(value: String): String =
    MessageDigest.getInstance("SHA-256")
      .digest(value.toByteArray())
      .joinToString("") { "%02x".format(it) }
}
