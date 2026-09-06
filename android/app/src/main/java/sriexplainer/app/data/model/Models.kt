package sriexplainer.app.data.model

import com.google.gson.annotations.SerializedName

data class Series(
    @SerializedName("id") val id: String,
    @SerializedName("_id") val altId: String? = null,
    @SerializedName("title") val title: String,
    @SerializedName("slug") val slug: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("genre") val genre: String? = null,
    @SerializedName("genres") val genres: List<String>? = null,
    @SerializedName("year") val year: Int? = null,
    @SerializedName("views") val views: Long? = 0,
    @SerializedName("rating") val rating: String? = null, // e.g. "PG-13", "TV-MA"
    @SerializedName("thumbnail") val thumbnail: String? = null,
    @SerializedName("banner") val banner: String? = null,
    @SerializedName("episodeCount") val episodeCount: Int? = 0,
    @SerializedName("latestEpisodeNumber") val latestEpisodeNumber: Int? = null,
    @SerializedName("latestQuality") val latestQuality: String? = null,
    @SerializedName("isUpcoming") val isUpcoming: Boolean? = false,
    @SerializedName("featured") val featured: Boolean? = false,
    @SerializedName("trending") val trending: Boolean? = false,
    @SerializedName("type") val type: String? = null
) {
    val bestImageUrl: String
        get() = when {
            !thumbnail.isNullOrBlank() -> formatImageUrl(thumbnail)
            !banner.isNullOrBlank() -> formatImageUrl(banner)
            else -> ""
        }

    val bestBannerUrl: String
        get() = when {
            !banner.isNullOrBlank() -> formatImageUrl(banner)
            !thumbnail.isNullOrBlank() -> formatImageUrl(thumbnail)
            else -> ""
        }

    val displayGenre: String
        get() {
            val rawCandidate = genres?.firstOrNull { it.isNotBlank() && it != "[]" && it != "null" }
                ?: genre?.takeIf { it.isNotBlank() && it != "[]" && it != "null" }
                ?: type?.takeIf { it.isNotBlank() && it != "[]" }
                ?: "Tamil Series"
            val cleaned = rawCandidate.replace("[", "").replace("]", "").replace("\"", "").trim()
            return if (cleaned.isBlank() || cleaned.equals("null", ignoreCase = true)) "Tamil Series" else cleaned
        }
}

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class GoogleLoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("credential") val credential: String? = null
)

data class LoginResponse(
    @SerializedName("token") val token: String? = null,
    @SerializedName("user") val user: User? = null,
    @SerializedName("message") val message: String? = null
)

data class CreateOrderRequest(
    @SerializedName("plan") val plan: String,
    @SerializedName("amount") val amount: Int
)

data class CashfreeOrderResponse(
    @SerializedName("order_id") val orderId: String? = null,
    @SerializedName("payment_session_id") val paymentSessionId: String? = null,
    @SerializedName("environment") val environment: String? = "PRODUCTION",
    @SerializedName("message") val message: String? = null
)

data class VerifyOrderRequest(
    @SerializedName("order_id") val orderId: String
)

data class VerifyOrderResponse(
    @SerializedName("success") val success: Boolean? = false,
    @SerializedName("message") val message: String? = null,
    @SerializedName("xpCoins") val xpCoins: Int? = null,
    @SerializedName("alreadyVerified") val alreadyVerified: Boolean? = false
)

data class UserMeResponse(
    @SerializedName("id") val id: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("xpCoins") val xpCoins: Int? = null,
    @SerializedName("user") val user: User? = null
) {
    fun toUser(): User {
        return user ?: User(
            id = id ?: "",
            name = name,
            email = email,
            avatar = avatar,
            role = role ?: "user",
            xpCoins = xpCoins ?: 0
        )
    }
}

data class Slide(
    @SerializedName("id") val id: String? = null,
    @SerializedName("seriesId") val seriesId: String? = null,
    @SerializedName("slug") val slug: String? = null,
    @SerializedName("title") val title: String? = null,
    @SerializedName("subtitle") val subtitle: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("heroImage") val heroImage: String? = null,
    @SerializedName("thumbnail") val thumbnail: String? = null,
    @SerializedName("banner") val banner: String? = null,
    @SerializedName("buttonText") val buttonText: String? = "Watch Now",
    @SerializedName("buttonLink") val buttonLink: String? = null,
    @SerializedName("genres") val genres: List<String>? = null
) {
    val bestImageUrl: String
        get() = when {
            !heroImage.isNullOrBlank() -> formatImageUrl(heroImage)
            !banner.isNullOrBlank() -> formatImageUrl(banner)
            !thumbnail.isNullOrBlank() -> formatImageUrl(thumbnail)
            else -> ""
        }
}

data class Episode(
    @SerializedName("id") val id: String,
    @SerializedName("_id") val altId: String? = null,
    @SerializedName("seriesId") val seriesId: String? = null,
    @SerializedName("number") val number: Int? = 1,
    @SerializedName("title") val title: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("rumbleEmbedUrl") val rumbleEmbedUrl: String? = null,
    @SerializedName("rumbleUrl") val rumbleUrl: String? = null,
    @SerializedName("videoUrl") val videoUrl: String? = null,
    @SerializedName("thumbnail") val thumbnail: String? = null,
    @SerializedName("seriesThumbnail") val seriesThumbnail: String? = null,
    @SerializedName("duration") val duration: String? = null,
    @SerializedName("views") val views: Long? = 0,
    @SerializedName("seriesTitle") val seriesTitle: String? = null,
    @SerializedName("seriesSlug") val seriesSlug: String? = null,
    @SerializedName("isUnlocked") val isUnlocked: Boolean? = true,
    @SerializedName("access") val access: String? = "free",
    @SerializedName("quality") val quality: String? = "1080P"
) {
    val bestThumbnailUrl: String
        get() = when {
            !thumbnail.isNullOrBlank() -> formatImageUrl(thumbnail)
            !seriesThumbnail.isNullOrBlank() -> formatImageUrl(seriesThumbnail)
            else -> ""
        }

    val playableVideoUrl: String
        get() = when {
            !rumbleEmbedUrl.isNullOrBlank() -> rumbleEmbedUrl
            !rumbleUrl.isNullOrBlank() -> rumbleUrl
            !videoUrl.isNullOrBlank() -> videoUrl
            else -> ""
        }

    val isVip: Boolean
        get() = access.equals("vip", ignoreCase = true) || isUnlocked == false
}

data class SeriesDetailResponse(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String? = null,
    @SerializedName("series") val series: Series? = null,
    @SerializedName("episodes") val episodes: List<Episode>? = null
)

data class User(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("role") val role: String? = "user",
    @SerializedName("xpCoins") val xpCoins: Int? = 0
)

data class WatchProgress(
    val episodeId: String,
    val seriesId: String,
    val seriesTitle: String,
    val episodeNumber: Int,
    val progressSeconds: Long,
    val totalSeconds: Long,
    val lastWatchedTimestamp: Long
)

data class WatchHistoryItem(
    @SerializedName("episodeId") val episodeId: String,
    @SerializedName("seriesId") val seriesId: String? = null,
    @SerializedName("seriesTitle") val seriesTitle: String? = null,
    @SerializedName("episodeNumber") val episodeNumber: Int? = 1,
    @SerializedName("episodeTitle") val episodeTitle: String? = null,
    @SerializedName("thumbnail") val thumbnail: String? = null,
    @SerializedName("positionSec") val positionSec: Long = 0,
    @SerializedName("durationSec") val durationSec: Long = 0,
    @SerializedName("percentage") val percentage: Int = 0,
    @SerializedName("updatedAt") val updatedAt: Long = System.currentTimeMillis()
) {
    val formattedPosition: String
        get() {
            val m = positionSec / 60
            val s = positionSec % 60
            return "%02d:%02d".format(m, s)
        }

    val bestThumbnailUrl: String
        get() = formatImageUrl(thumbnail)
}

data class ProgressSyncRequest(
    @SerializedName("episodeId") val episodeId: String,
    @SerializedName("currentPosition") val currentPosition: Long,
    @SerializedName("duration") val duration: Long,
    @SerializedName("progress") val progress: Int
)

data class ProgressSyncResponse(
    @SerializedName("success") val success: Boolean? = false,
    @SerializedName("percentage") val percentage: Int? = 0,
    @SerializedName("completed") val completed: Boolean? = false
)

// Helper to normalize image URLs from backend
fun formatImageUrl(url: String?): String {
    if (url.isNullOrBlank()) return ""
    val trimmed = url.trim()
    return when {
        trimmed.startsWith("http://") || trimmed.startsWith("https://") -> trimmed
        trimmed.startsWith("/") -> "https://sriexplainer.in$trimmed"
        else -> "https://sriexplainer.in/$trimmed"
    }
}

data class CommentUser(
    @SerializedName("id") val id: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("role") val role: String? = null
) {
    val displayAvatar: String
        get() = formatImageUrl(avatar)
}

data class EpisodeComment(
    @SerializedName("id") val id: String,
    @SerializedName("episodeId") val episodeId: String,
    @SerializedName("userId") val userId: String? = null,
    @SerializedName("parentId") val parentId: String? = null,
    @SerializedName("content") val content: String,
    @SerializedName("likesCount") val likesCount: Int = 0,
    @SerializedName("isPinned") val isPinned: Boolean = false,
    @SerializedName("userLiked") val userLiked: Boolean = false,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("user") val user: CommentUser? = null,
    @SerializedName("replies") val replies: List<EpisodeComment>? = emptyList()
)

data class PostCommentRequest(
    @SerializedName("content") val content: String,
    @SerializedName("guestName") val guestName: String? = null,
    @SerializedName("parentId") val parentId: String? = null
)

data class SiteAnnouncement(
    @SerializedName("id") val id: String? = null,
    @SerializedName("title") val title: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("type") val type: String? = null,
    @SerializedName("link") val link: String? = null,
    @SerializedName("isActive") val isActive: Boolean? = true
)

data class AppUpdateInfo(
    @SerializedName("versionCode") val versionCode: Int = 0,
    @SerializedName("versionName") val versionName: String = "",
    @SerializedName("downloadUrl") val downloadUrl: String = "",
    @SerializedName("fallbackUrl") val fallbackUrl: String? = null,
    @SerializedName("changeLog") val changeLog: String? = null,
    @SerializedName("forceUpdate") val forceUpdate: Boolean = false
)


