package expo.modules.stickerruntime

import android.app.DownloadManager
import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.os.StatFs
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

internal data class ModelPart(
  val name: String,
  val path: String,
  val bytes: Long,
  val sha256: String,
  val url: String,
)

internal object PythonCanonicalJson {
  fun quote(value: String): String = buildString {
    append('"')
    value.forEach { character ->
      when (character) {
        '"' -> append("\\\"")
        '\\' -> append("\\\\")
        '\b' -> append("\\b")
        '\u000c' -> append("\\f")
        '\n' -> append("\\n")
        '\r' -> append("\\r")
        '\t' -> append("\\t")
        else -> {
          if (character.code < 0x20 || character.code >= 0x80) {
            append("\\u")
            append(character.code.toString(16).padStart(4, '0'))
          } else {
            append(character)
          }
        }
      }
    }
    append('"')
  }
}

internal data class DistributionManifest(
  val modelId: String,
  val modelVersion: String,
  val artifactSha256: String,
  val artifactBytes: Long,
  val minimumStorageBytes: Long,
  val minimumMemoryMb: Long,
  val parts: List<ModelPart>,
) {
  companion object {
    fun parse(json: String): DistributionManifest {
      val root = JSONObject(json)
      val rawParts = root.getJSONArray("parts")
      val parts = (0 until rawParts.length()).map { index ->
        val part = rawParts.getJSONObject(index)
        val path = part.getString("path")
        require(isSafeRelativePath(path)) { "Unsafe model path: $path" }
        ModelPart(
          name = part.getString("name"),
          path = path,
          bytes = part.getLong("bytes"),
          sha256 = part.getString("sha256"),
          url = part.getString("url"),
        )
      }
      require(parts.isNotEmpty()) { "Distribution manifest has no model parts" }
      val artifactSha256 = root.getString("artifactSha256").lowercase()
      require(artifactSha256 == canonicalDigest(parts)) {
        "Canonical model bundle digest does not match its parts"
      }
      return DistributionManifest(
        modelId = root.getString("modelId"),
        modelVersion = root.getString("modelVersion"),
        artifactSha256 = artifactSha256,
        artifactBytes = root.getLong("artifactBytes"),
        minimumStorageBytes = root.getLong("minimumStorageBytes"),
        minimumMemoryMb = root.getLong("minimumMemoryMb"),
        parts = parts,
      )
    }

    private fun isSafeRelativePath(path: String): Boolean =
      path.isNotBlank() && !path.startsWith('/') && !path.startsWith('\\') &&
        path.split('/', '\\').none { it == ".." || it.isBlank() }

    private fun canonicalDigest(parts: List<ModelPart>): String {
      val canonical = parts.joinToString(prefix = "[", postfix = "]", separator = ",") { part ->
        """{"bytes":${part.bytes},"name":${PythonCanonicalJson.quote(part.name)},"path":${PythonCanonicalJson.quote(part.path)},"sha256":${PythonCanonicalJson.quote(part.sha256)},"url":${PythonCanonicalJson.quote(part.url)}}"""
      }
      return MessageDigest.getInstance("SHA-256")
        .digest(canonical.toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it) }
    }
  }
}

internal object LocalImportPaths {
  fun select(parts: List<ModelPart>, external: File, internal: File): File =
    listOf(external, internal).firstOrNull { root ->
      parts.all { part -> File(root, part.path).isFile }
    } ?: external
}

internal class ModelBundleManager(private val context: Context) {
  private val root = File(context.filesDir, "sticker-model")
  private val staging = File(root, "staging")
  private val ready = File(root, "ready")
  private val downloadManager = context.getSystemService(DownloadManager::class.java)
  private val preferences = context.getSharedPreferences("sticker-model-downloads", Context.MODE_PRIVATE)

  fun loadManifest(): DistributionManifest = context.assets
    .open("model-distribution.manifest.json")
    .bufferedReader()
    .use { DistributionManifest.parse(it.readText()) }

  fun hasEnoughStorage(manifest: DistributionManifest): Boolean =
    StatFs(context.filesDir.absolutePath).availableBytes >= manifest.minimumStorageBytes

  fun installLocal(manifest: DistributionManifest) {
    val externalRoot = requireNotNull(context.getExternalFilesDir(null)) {
      "External files directory is unavailable"
    }
    val externalStaging = File(externalRoot, "model-import")
    val internalStaging = File(context.filesDir, "model-import")
    LocalModelInstaller(
      root = root,
      staging = LocalImportPaths.select(manifest.parts, externalStaging, internalStaging),
      availableBytes = { StatFs(context.filesDir.absolutePath).availableBytes },
    ).install(manifest)
  }

  fun isReady(manifest: DistributionManifest): Boolean =
    File(ready, ".bundle-${manifest.artifactSha256}").isFile &&
      manifest.parts.all { verify(File(ready, it.path), it) }

  fun enqueue(manifest: DistributionManifest): List<Long> {
    require(hasEnoughStorage(manifest)) { "Insufficient storage for model setup" }
    staging.mkdirs()
    return manifest.parts.map { part ->
      val destination = File(staging, part.name).also { it.parentFile?.mkdirs() }
      val request = DownloadManager.Request(Uri.parse(part.url))
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(false)
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
        .setDestinationUri(Uri.fromFile(destination))
      downloadManager.enqueue(request).also { id ->
        preferences.edit().putLong(part.name, id).apply()
      }
    }
  }

  fun cancel(manifest: DistributionManifest) {
    manifest.parts.mapNotNull { part ->
      preferences.getLong(part.name, -1L).takeIf { it >= 0 }
    }.forEach(downloadManager::remove)
    preferences.edit().clear().apply()
  }

  fun progress(manifest: DistributionManifest): Pair<Long, Long> {
    var downloaded = 0L
    manifest.parts.forEach { part ->
      val id = preferences.getLong(part.name, -1L)
      if (id >= 0) {
        val cursor: Cursor = downloadManager.query(DownloadManager.Query().setFilterById(id))
        cursor.use {
          if (it.moveToFirst()) {
            downloaded += it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
          }
        }
      }
    }
    return downloaded to manifest.artifactBytes
  }

  fun promote(manifest: DistributionManifest) {
    val promotion = File(root, "promoting-${manifest.artifactSha256}")
    promotion.deleteRecursively()
    promotion.mkdirs()
    manifest.parts.forEach { part ->
      val source = File(staging, part.name)
      require(verify(source, part)) { "Checksum verification failed for ${part.name}" }
      val destination = File(promotion, part.path)
      destination.parentFile?.mkdirs()
      require(source.renameTo(destination)) { "Could not promote ${part.name}" }
    }
    File(promotion, ".bundle-${manifest.artifactSha256}").writeText(manifest.modelVersion)
    val previous = File(root, "previous")
    previous.deleteRecursively()
    if (ready.exists()) require(ready.renameTo(previous))
    require(promotion.renameTo(ready)) { "Atomic model promotion failed" }
    previous.deleteRecursively()
    staging.deleteRecursively()
    preferences.edit().clear().apply()
  }

  private fun verify(file: File, part: ModelPart): Boolean =
    file.isFile && file.length() == part.bytes && sha256(file) == part.sha256.lowercase()

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
