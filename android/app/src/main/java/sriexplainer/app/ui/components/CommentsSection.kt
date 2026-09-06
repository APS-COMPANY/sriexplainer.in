package sriexplainer.app.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import sriexplainer.app.data.model.EpisodeComment
import sriexplainer.app.data.repository.SeriesRepository
import sriexplainer.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun CommentsSection(
    episodeId: String,
    token: String?,
    isLoggedIn: Boolean,
    currentUserName: String?,
    onLoginRequired: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val repository = remember { SeriesRepository() }

    var comments by remember { mutableStateOf<List<EpisodeComment>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var commentText by remember { mutableStateOf("") }
    var guestNameInput by remember { mutableStateOf("") }
    var isPosting by remember { mutableStateOf(false) }

    fun loadComments() {
        coroutineScope.launch {
            isLoading = true
            repository.getEpisodeComments(episodeId, token).fold(
                onSuccess = { list ->
                    comments = list
                    isLoading = false
                },
                onFailure = {
                    isLoading = false
                }
            )
        }
    }

    LaunchedEffect(episodeId, token) {
        loadComments()
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
    ) {
        // Section Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "COMMUNITY DISCUSSION",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    letterSpacing = 0.5.sp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(BrandPurple.copy(alpha = 0.3f))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "${comments.size}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = BrandPurpleLight
                    )
                }
            }

            IconButton(
                onClick = { loadComments() },
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Refresh comments",
                    tint = TextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Comment Input Box
        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = CardSurface),
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                if (!isLoggedIn) {
                    // Guest name row
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(bottom = 8.dp)
                    ) {
                        OutlinedTextField(
                            value = guestNameInput,
                            onValueChange = { guestNameInput = it },
                            placeholder = { Text("Your Name (or Guest)", fontSize = 12.sp, color = TextMuted) },
                            singleLine = true,
                            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp, color = TextPrimary),
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp),
                            shape = RoundedCornerShape(8.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandPurple,
                                unfocusedBorderColor = BorderDark,
                                focusedContainerColor = Color(0xFF0F0A1C),
                                unfocusedContainerColor = Color(0xFF0F0A1C)
                            )
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        TextButton(
                            onClick = onLoginRequired,
                            contentPadding = PaddingValues(horizontal = 8.dp)
                        ) {
                            Text("Sign In", fontSize = 11.sp, color = BrandPurpleLight, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = commentText,
                        onValueChange = { commentText = it },
                        placeholder = { Text("Share your thoughts on this episode...", fontSize = 13.sp, color = TextMuted) },
                        maxLines = 3,
                        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp, color = TextPrimary),
                        modifier = Modifier
                            .weight(1f)
                            .defaultMinSize(minHeight = 44.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandPurple,
                            unfocusedBorderColor = BorderDark,
                            focusedContainerColor = Color(0xFF0F0A1C),
                            unfocusedContainerColor = Color(0xFF0F0A1C)
                        )
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    IconButton(
                        onClick = {
                            val content = commentText.trim()
                            if (content.isNotBlank() && !isPosting) {
                                isPosting = true
                                val gName = if (guestNameInput.isNotBlank()) guestNameInput.trim() else "Guest User"
                                coroutineScope.launch {
                                    repository.postComment(
                                        episodeId = episodeId,
                                        content = content,
                                        token = token,
                                        guestName = gName
                                    ).fold(
                                        onSuccess = { newComment ->
                                            commentText = ""
                                            isPosting = false
                                            comments = listOf(newComment) + comments.filter { it.id != newComment.id }
                                            Toast.makeText(context, "Comment posted!", Toast.LENGTH_SHORT).show()
                                        },
                                        onFailure = { err ->
                                            isPosting = false
                                            val msg = err.message ?: "Failed to post comment"
                                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                        }
                                    )
                                }
                            }
                        },
                        enabled = commentText.isNotBlank() && !isPosting,
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(if (commentText.isNotBlank()) BrandPurple else Color.White.copy(alpha = 0.1f))
                    ) {
                        if (isPosting) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(16.dp)
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Send,
                                contentDescription = "Post",
                                tint = if (commentText.isNotBlank()) Color.White else TextMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Comment list or empty / loading states
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = BrandPurple, modifier = Modifier.size(28.dp))
            }
        } else if (comments.isEmpty()) {
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Outlined.ChatBubbleOutline,
                        contentDescription = null,
                        tint = BrandPurpleLight.copy(alpha = 0.6f),
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "No comments yet",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Be the first fan to start the discussion!",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                comments.forEach { comment ->
                    CommentItemCard(
                        comment = comment,
                        token = token,
                        onLikeClick = {
                            if (token.isNullOrBlank()) {
                                Toast.makeText(context, "Sign in to like comments", Toast.LENGTH_SHORT).show()
                                onLoginRequired()
                            } else {
                                coroutineScope.launch {
                                    val isNowLiked = !comment.userLiked
                                    val newCount = if (isNowLiked) comment.likesCount + 1 else (comment.likesCount - 1).coerceAtLeast(0)
                                    comments = comments.map { c ->
                                        if (c.id == comment.id) c.copy(userLiked = isNowLiked, likesCount = newCount) else c
                                    }
                                    repository.likeComment(comment.id, token)
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun CommentItemCard(
    comment: EpisodeComment,
    token: String?,
    onLikeClick: () -> Unit
) {
    val userName = comment.user?.name ?: "Fan"
    val avatarUrl = comment.user?.displayAvatar ?: ""
    val userRole = comment.user?.role?.lowercase() ?: "user"
    val isStaff = userRole == "admin" || userRole == "creator" || userRole == "moderator"

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (comment.isPinned) Color(0xFF1E1435) else CardSurface
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (comment.isPinned) BrandPurple else BorderDark
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            if (comment.isPinned) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(bottom = 6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(StarGold)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "PINNED COMMENT",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = StarGold,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                // Avatar circle
                if (avatarUrl.isNotBlank()) {
                    AsyncImage(
                        model = avatarUrl,
                        contentDescription = userName,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(Color(0xFF9333EA), Color(0xFF4F46E5))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = userName.take(1).uppercase(),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = userName,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            if (isStaff) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(BrandPurple.copy(alpha = 0.4f))
                                        .border(0.5.dp, BrandPurple, RoundedCornerShape(4.dp))
                                        .padding(horizontal = 4.dp, vertical = 1.dp)
                                ) {
                                    Text(
                                        text = "STAFF",
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Black,
                                        color = StarGold
                                    )
                                }
                            }
                        }

                        Text(
                            text = formatTimeAgo(comment.createdAt),
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = comment.content,
                        fontSize = 13.sp,
                        color = TextSecondary,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    // Like action button
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable(onClick = onLikeClick)
                    ) {
                        Icon(
                            imageVector = if (comment.userLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = "Like",
                            tint = if (comment.userLiked) Color(0xFFE50914) else TextMuted,
                            modifier = Modifier.size(15.dp)
                        )
                        if (comment.likesCount > 0) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "${comment.likesCount}",
                                fontSize = 11.sp,
                                color = if (comment.userLiked) Color(0xFFE50914) else TextMuted,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }
    }
}

fun formatTimeAgo(dateStr: String?): String {
    if (dateStr.isNullOrBlank()) return "recent"
    return try {
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val cleanDate = if (dateStr.contains(".")) dateStr.substringBefore(".") else dateStr.replace("Z", "")
        val date = format.parse(cleanDate) ?: return "recent"
        val diffMs = System.currentTimeMillis() - date.time
        val seconds = diffMs / 1000
        val minutes = seconds / 60
        val hours = minutes / 60
        val days = hours / 24

        when {
            days > 0 -> "${days}d ago"
            hours > 0 -> "${hours}h ago"
            minutes > 0 -> "${minutes}m ago"
            else -> "Just now"
        }
    } catch (_: Exception) {
        "recent"
    }
}
