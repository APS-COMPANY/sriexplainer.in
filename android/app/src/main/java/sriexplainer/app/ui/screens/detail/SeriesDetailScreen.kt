package sriexplainer.app.ui.screens.detail

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BookmarkAdded
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import sriexplainer.app.data.local.WatchlistManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import sriexplainer.app.data.model.Episode
import sriexplainer.app.data.model.Series
import sriexplainer.app.ui.theme.*
import sriexplainer.app.ui.viewmodel.SeriesDetailViewModel

@Composable
fun SeriesDetailScreen(
    seriesId: String,
    initialSeries: Series?,
    onBackClick: () -> Unit,
    onEpisodeClick: (Episode) -> Unit,
    viewModel: SeriesDetailViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val watchlistManager = remember { WatchlistManager.getInstance(context) }
    val watchlist by watchlistManager.watchlist.collectAsState()

    LaunchedEffect(seriesId) {
        viewModel.loadSeries(seriesId)
    }

    val series = uiState.series ?: initialSeries

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
    ) {
        if (series == null && uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandPurple)
            }
        } else if (series != null) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 60.dp)
            ) {
                // 1. Hero Backdrop Header
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(340.dp)
                    ) {
                        AsyncImage(
                            model = series.bestBannerUrl.ifEmpty { series.bestImageUrl },
                            contentDescription = series.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )

                        // Dark Gradient Fade
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color.Black.copy(alpha = 0.4f),
                                            Color.Transparent,
                                            BgDark.copy(alpha = 0.8f),
                                            BgDark
                                        )
                                    )
                                )
                        )
                    }
                }

                // 2. Metadata Info & Action Buttons
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp)
                    ) {
                        // Title
                        Text(
                            text = series.title,
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // Metadata Row (Year, Quality, Views, Episodes)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "${series.year ?: 2026}",
                                fontSize = 12.sp,
                                color = TextMuted,
                                fontWeight = FontWeight.SemiBold
                            )

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(CardSurfaceVariant)
                                    .border(0.5.dp, BorderDark, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = series.latestQuality ?: "1080P",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = BrandPurpleLight
                                )
                            }

                            if ((series.episodeCount ?: 0) > 0) {
                                Text(
                                    text = "• ${series.episodeCount} Episodes",
                                    fontSize = 12.sp,
                                    color = TextMuted
                                )
                            }

                            if ((series.views ?: 0) > 0) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Visibility,
                                        contentDescription = null,
                                        tint = TextDimmed,
                                        modifier = Modifier.size(13.dp)
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = "${series.views}",
                                        fontSize = 12.sp,
                                        color = TextDimmed
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Genre badges
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            val genreList = series.genres ?: listOf(series.displayGenre)
                            genreList.take(3).forEach { g ->
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(CardSurface)
                                        .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = g,
                                        fontSize = 11.sp,
                                        color = TextSecondary,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Action Buttons: Play Ep 1 + Add to Watchlist
                        val firstEpisode = uiState.episodes.firstOrNull()
                        val isInWatchlist = watchlist.any { it.id == series.id || it.altId == series.id }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Button(
                                onClick = {
                                    if (firstEpisode != null) {
                                        onEpisodeClick(firstEpisode)
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = BrandPurple,
                                    contentColor = TextPrimary
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    modifier = Modifier.size(22.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (firstEpisode != null) "Watch Ep 1" else "Play",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }

                            OutlinedButton(
                                onClick = {
                                    val added = watchlistManager.toggleWatchlist(series)
                                    val msg = if (added) "Added to My Watchlist" else "Removed from Watchlist"
                                    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                },
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(
                                    1.dp,
                                    if (isInWatchlist) BrandPurpleLight else Color.White.copy(alpha = 0.3f)
                                ),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    containerColor = if (isInWatchlist) BrandPurple.copy(alpha = 0.25f) else Color.Transparent
                                ),
                                modifier = Modifier.height(48.dp)
                            ) {
                                Icon(
                                    imageVector = if (isInWatchlist) Icons.Default.BookmarkAdded else Icons.Default.BookmarkBorder,
                                    contentDescription = "Watchlist",
                                    tint = if (isInWatchlist) BrandPurpleLight else Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (isInWatchlist) "In List" else "My List",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = if (isInWatchlist) BrandPurpleLight else Color.White
                                )
                            }
                        }

                        // Synopsis Description
                        if (!series.description.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(18.dp))
                            Text(
                                text = "Synopsis",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = series.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary,
                                lineHeight = 20.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // Episodes Section Header
                        Text(
                            text = "Episodes (${uiState.episodes.size})",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )

                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }

                // 3. Episodes List
                if (uiState.episodes.isEmpty() && uiState.isLoading) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = BrandPurple, modifier = Modifier.size(32.dp))
                        }
                    }
                } else if (uiState.episodes.isEmpty()) {
                    item {
                        Text(
                            text = "No episodes released yet for this series.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextMuted,
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)
                        )
                    }
                } else {
                    items(uiState.episodes, key = { it.id }) { ep ->
                        EpisodeListItem(
                            episode = ep,
                            onClick = { onEpisodeClick(ep) }
                        )
                    }
                }
            }
        }

        // Floating Back Button
        IconButton(
            onClick = onBackClick,
            modifier = Modifier
                .statusBarsPadding()
                .padding(16.dp)
                .size(40.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.6f))
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = TextPrimary
            )
        }
    }
}

@Composable
fun EpisodeListItem(
    episode: Episode,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Thumbnail with Play Icon
        Box(
            modifier = Modifier
                .width(115.dp)
                .height(68.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(CardSurface)
                .border(0.5.dp, BorderDark, RoundedCornerShape(8.dp))
        ) {
            AsyncImage(
                model = episode.bestThumbnailUrl,
                contentDescription = episode.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Play overlay circle
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.7f))
                    .align(Alignment.Center),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = null,
                    tint = TextPrimary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.width(14.dp))

        // Episode Metadata
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "EPISODE ${episode.number ?: 1}",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = BrandPurpleLight,
                letterSpacing = 0.8.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = episode.title ?: "Episode ${episode.number}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (!episode.duration.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = episode.duration,
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }
        }
    }
}
