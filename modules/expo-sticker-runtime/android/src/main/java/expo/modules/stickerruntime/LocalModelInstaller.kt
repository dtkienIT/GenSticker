package expo.modules.stickerruntime

import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

internal class LocalModelImportException(
  val code: String,
  detail: String? = null,
  cause: Throwable? = null,
) : IllegalStateException(detail ?: code, cause)

internal class LocalModelInstaller(
  private val root: File,
  private val staging: File,
  private val availableBytes: () -> Long,
  private val rename: (File, File) -> Boolean = { source, destination ->
    source.renameTo(destination)
  },
) {
  fun install(manifest: DistributionManifest) {
    if (!staging.isDirectory) {
      throw LocalModelImportException("LOCAL_MODEL_NOT_STAGED")
    }
    if (availableBytes() < manifest.minimumStorageBytes) {
      throw LocalModelImportException("INSUFFICIENT_STORAGE")
    }
    manifest.parts.forEach { part ->
      val file = File(staging, part.path)
      val actualBytes = if (file.isFile) file.length() else null
      val actualSha256 = if (actualBytes == part.bytes) sha256(file) else null
      if (actualBytes != part.bytes || actualSha256 != part.sha256.lowercase()) {
        throw LocalModelImportException(
          code = "MODEL_CHECKSUM_MISMATCH",
          detail = "MODEL_CHECKSUM_MISMATCH:${part.path} " +
            "expectedBytes=${part.bytes} actualBytes=$actualBytes " +
            "expectedSha256=${part.sha256.lowercase()} actualSha256=$actualSha256",
        )
      }
    }

    val promotion = File(root, "promoting-local-${manifest.artifactSha256}")
    val ready = File(root, "ready")
    val previous = File(root, "previous")
    try {
      promotion.deleteRecursively()
      check(promotion.mkdirs()) { "Could not create promotion directory" }
      manifest.parts.forEach { part ->
        val destination = File(promotion, part.path)
        destination.parentFile?.mkdirs()
        File(staging, part.path).copyTo(destination)
      }
      File(promotion, ".bundle-${manifest.artifactSha256}").writeText(manifest.modelVersion)

      previous.deleteRecursively()
      if (ready.exists() && !rename(ready, previous)) {
        throw IllegalStateException("Could not preserve ready bundle")
      }
      if (!rename(promotion, ready)) {
        if (previous.exists()) rename(previous, ready)
        throw IllegalStateException("Could not promote verified bundle")
      }
      previous.deleteRecursively()
      staging.deleteRecursively()
    } catch (error: LocalModelImportException) {
      throw error
    } catch (error: Throwable) {
      promotion.deleteRecursively()
      throw LocalModelImportException("MODEL_PROMOTION_FAILED", cause = error)
    }
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    FileInputStream(file).use { input ->
      val buffer = ByteArray(1024 * 1024)
      while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        digest.update(buffer, 0, count)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }
}
