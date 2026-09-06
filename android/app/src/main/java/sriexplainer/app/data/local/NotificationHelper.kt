package sriexplainer.app.data.local

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import sriexplainer.app.MainActivity
import sriexplainer.app.R
import sriexplainer.app.data.model.Episode

object NotificationHelper {

    const val CHANNEL_ID = "sri_new_episodes"
    private const val CHANNEL_NAME = "New Episodes & Releases"
    private const val PREFS_NAME = "sri_notification_prefs"
    private const val KEY_LAST_EPISODE_ID = "last_notified_episode_id"

    fun initChannel(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Instant alerts when new Tamil web series episodes are uploaded"
                    enableLights(true)
                    lightColor = 0xFFA855F7.toInt()
                    enableVibration(true)
                }
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.createNotificationChannel(channel)
            }
        } catch (_: Exception) {}
    }

    fun showNewEpisodeNotification(context: Context, episode: Episode) {
        initChannel(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("episode_id", episode.id)
            putExtra("series_title", episode.seriesTitle)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            episode.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = "🔥 New Episode: ${episode.seriesTitle ?: "Sri Explainer"}"
        val text = "Episode ${episode.number ?: 1}: ${episode.title ?: "Now Available in 1080P HD"}"

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_sri_logo)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setColor(0xFFA855F7.toInt())
            .setContentIntent(pendingIntent)

        try {
            val notificationManager = NotificationManagerCompat.from(context)
            // Verify permission if on Android 13+
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                androidx.core.content.ContextCompat.checkSelfPermission(
                    context,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                notificationManager.notify(episode.id.hashCode(), builder.build())
            }
        } catch (_: SecurityException) {
            // Permission not yet granted
        } catch (_: Exception) {
        }
    }

    fun checkAndNotifyNewEpisodes(context: Context, episodes: List<Episode>) {
        try {
            if (episodes.isEmpty()) return

            val prefs: SharedPreferences =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val lastSeenId = prefs.getString(KEY_LAST_EPISODE_ID, null)
            val latestEpisode = episodes.firstOrNull() ?: return

            if (lastSeenId == null) {
                // First time app starts, record current newest episode ID without notifying
                prefs.edit().putString(KEY_LAST_EPISODE_ID, latestEpisode.id).apply()
                return
            }

            if (lastSeenId != latestEpisode.id) {
                // Brand new episode detected!
                showNewEpisodeNotification(context, latestEpisode)
                prefs.edit().putString(KEY_LAST_EPISODE_ID, latestEpisode.id).apply()
            }
        } catch (_: Exception) {}
    }
}
