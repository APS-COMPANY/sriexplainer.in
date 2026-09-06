package sriexplainer.app.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

sealed class UpdateDownloadState {
    object Idle : UpdateDownloadState()
    data class Downloading(val progressPercent: Int, val downloadedBytes: Long, val totalBytes: Long) : UpdateDownloadState()
    data class ReadyToInstall(val file: File) : UpdateDownloadState()
    data class Error(val message: String) : UpdateDownloadState()
}

object AppUpdateManager {

    /**
     * Downloads the APK file in background with HTTP redirect support (needed for GitHub Releases / CDNs)
     */
    suspend fun downloadApk(
        context: Context,
        downloadUrl: String,
        onProgress: (UpdateDownloadState) -> Unit
    ): File? = withContext(Dispatchers.IO) {
        var connection: HttpURLConnection? = null
        var inputStream: InputStream? = null
        var outputStream: FileOutputStream? = null

        try {
            onProgress(UpdateDownloadState.Downloading(0, 0L, 0L))

            var targetUrl = downloadUrl
            var redirectCount = 0
            val maxRedirects = 5

            // Follow redirects manually (GitHub Releases -> S3 CDN redirects)
            while (redirectCount < maxRedirects) {
                val url = URL(targetUrl)
                connection = (url.openConnection() as HttpURLConnection).apply {
                    instanceFollowRedirects = true
                    connectTimeout = 15000
                    readTimeout = 30000
                    setRequestProperty("User-Agent", "SriExplainer-Android-Updater")
                    connect()
                }

                val status = connection.responseCode
                if (status == HttpURLConnection.HTTP_MOVED_PERM ||
                    status == HttpURLConnection.HTTP_MOVED_TEMP ||
                    status == 307 ||
                    status == 308
                ) {
                    val newLocation = connection.getHeaderField("Location")
                    connection.disconnect()
                    if (!newLocation.isNullOrBlank()) {
                        targetUrl = newLocation
                        redirectCount++
                        continue
                    }
                }
                break
            }

            val responseCode = connection?.responseCode ?: -1
            if (responseCode !in 200..299) {
                throw Exception("Server returned HTTP $responseCode")
            }

            val contentLength = connection?.contentLengthLong ?: -1L
            inputStream = connection?.inputStream ?: throw Exception("Empty input stream")

            val downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.cacheDir
            if (!downloadDir.exists()) downloadDir.mkdirs()

            val apkFile = File(downloadDir, "SriExplainer_update.apk")
            if (apkFile.exists()) {
                apkFile.delete()
            }

            outputStream = FileOutputStream(apkFile)
            val buffer = ByteArray(8 * 1024)
            var bytesRead: Int
            var totalBytesRead = 0L
            var lastReportedPercent = -1

            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
                totalBytesRead += bytesRead

                if (contentLength > 0) {
                    val percent = ((totalBytesRead * 100) / contentLength).toInt().coerceIn(0, 100)
                    if (percent != lastReportedPercent) {
                        lastReportedPercent = percent
                        withContext(Dispatchers.Main) {
                            onProgress(UpdateDownloadState.Downloading(percent, totalBytesRead, contentLength))
                        }
                    }
                }
            }

            outputStream.flush()

            withContext(Dispatchers.Main) {
                onProgress(UpdateDownloadState.ReadyToInstall(apkFile))
            }
            return@withContext apkFile
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                onProgress(UpdateDownloadState.Error(e.localizedMessage ?: "Download failed"))
            }
            return@withContext null
        } finally {
            try { outputStream?.close() } catch (_: Exception) {}
            try { inputStream?.close() } catch (_: Exception) {}
            connection?.disconnect()
        }
    }

    /**
     * Installs the downloaded APK using Android's system PackageInstaller via FileProvider
     */
    fun installApk(context: Context, apkFile: File) {
        if (!apkFile.exists()) return

        try {
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Fallback: open release download link directly in the device browser
     */
    fun openInBrowser(context: Context, url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
