package sriexplainer.app.ui.screens.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import sriexplainer.app.data.local.WatchlistManager
import sriexplainer.app.data.local.AdConfig
import sriexplainer.app.ui.components.AdBanner
import sriexplainer.app.ui.components.ReleaseRadarBottomSheet
import sriexplainer.app.BuildConfig
import sriexplainer.app.data.model.AppUpdateInfo
import sriexplainer.app.data.repository.SeriesRepository
import sriexplainer.app.ui.components.AppUpdateDialog
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import coil.compose.AsyncImage
import androidx.lifecycle.viewmodel.compose.viewModel
import sriexplainer.app.R
import sriexplainer.app.data.model.Series
import sriexplainer.app.data.model.WatchHistoryItem
import sriexplainer.app.ui.components.HeroBannerSlide
import sriexplainer.app.ui.components.HorizontalSeriesRow
import sriexplainer.app.ui.theme.*
import sriexplainer.app.ui.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    onSeriesClick: (Series) -> Unit,
    onEpisodeClick: (String) -> Unit = {},
    onSearchClick: () -> Unit,
    viewModel: HomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val watchlistManager = remember { WatchlistManager.getInstance(context) }
    val watchlist by watchlistManager.watchlist.collectAsState()
    var showReleaseRadar by remember { mutableStateOf(false) }

    val repository = remember { SeriesRepository() }
    var availableUpdate by remember { mutableStateOf<AppUpdateInfo?>(null) }

    LaunchedEffect(Unit) {
        AdConfig.loadInterstitialAd(context)
        repository.checkAppUpdate().onSuccess { update ->
            if (update != null && update.versionCode > BuildConfig.VERSION_CODE) {
                availableUpdate = update
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
    ) {
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    color = BrandPurple,
                    strokeWidth = 3.dp
                )
            }
        } else if (uiState.error != null && uiState.latestSeries.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Oops! Connection Error",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = uiState.error ?: "Unable to reach Sri Explainer servers",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMuted
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { viewModel.loadHomeData() },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPurple)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Retry")
                }
            }
        } else {
            val allSeries = remember(uiState) {
                (uiState.latestSeries + uiState.popularSeries + uiState.trendingSeries).distinctBy { it.id }
            }

            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 120.dp)
            ) {
                // 1. Hero Banner Carousel (Featured Slide)
                item {
                    val featuredSlide = uiState.slides.firstOrNull()
                    if (featuredSlide != null) {
                        HeroBannerSlide(
                            slide = featuredSlide,
                            onWatchClick = {
                                val linkedSeries = uiState.latestSeries.find { it.id == featuredSlide.seriesId || it.slug == featuredSlide.slug }
                                if (linkedSeries != null) {
                                    onSeriesClick(linkedSeries)
                                } else if (!featuredSlide.seriesId.isNullOrBlank()) {
                                    onSeriesClick(
                                        Series(
                                            id = featuredSlide.seriesId,
                                            title = featuredSlide.title ?: "Series",
                                            thumbnail = featuredSlide.thumbnail,
                                            banner = featuredSlide.banner
                                        )
                                    )
                                }
                            }
                        )
                    }
                }

                // 1.5. Continue Watching Row (Netflix Style)
                if (uiState.continueWatching.isNotEmpty()) {
                    item {
                        ContinueWatchingRow(
                            items = uiState.continueWatching,
                            allSeries = allSeries,
                            onItemClick = { item ->
                                onEpisodeClick(item.episodeId)
                            },
                            onRemoveClick = { item ->
                                viewModel.removeContinueWatching(item.episodeId)
                            }
                        )
                    }
                }

                // 1.8. My Watchlist Row
                if (watchlist.isNotEmpty()) {
                    item {
                        HorizontalSeriesRow(
                            title = "My Watchlist",
                            seriesList = watchlist,
                            onSeriesClick = onSeriesClick
                        )
                    }
                }

                // 2. Trending Now Row
                item {
                    HorizontalSeriesRow(
                        title = "Trending Now",
                        seriesList = uiState.trendingSeries,
                        onSeriesClick = onSeriesClick
                    )
                }

                // 3. Popular Series Row
                item {
                    HorizontalSeriesRow(
                        title = "Most Popular",
                        seriesList = uiState.popularSeries,
                        onSeriesClick = onSeriesClick
                    )
                }

                // 4. Latest Releases Row
                item {
                    HorizontalSeriesRow(
                        title = "Latest Releases",
                        seriesList = uiState.latestSeries,
                        onSeriesClick = onSeriesClick
                    )
                }

                // 5. Upcoming Series Row
                item {
                    HorizontalSeriesRow(
                        title = "Upcoming Series",
                        seriesList = uiState.upcomingSeries,
                        onSeriesClick = onSeriesClick
                    )
                }
            }
        }

        // Top Glassmorphic Navigation Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            BgDark.copy(alpha = 0.95f),
                            BgDark.copy(alpha = 0.6f),
                            Color.Transparent
                        )
                    )
                )
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // App Brand Logo & Name
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painter = painterResource(id = R.drawable.ic_sri_logo),
                    contentDescription = "Sri Explainer Logo",
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "SRI EXPLAINER",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.2.sp,
                    color = TextPrimary
                )
            }

            // Actions: Release Radar Bell & Search
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Release Radar Bell Button
                Box {
                    IconButton(
                        onClick = { showReleaseRadar = true },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(CardSurface.copy(alpha = 0.8f))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "Release Radar",
                            tint = TextPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    // Animated/Bright Notification Dot
                    Box(
                        modifier = Modifier
                            .size(9.dp)
                            .align(Alignment.TopEnd)
                            .offset(x = (-3).dp, y = 3.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFE50914))
                            .border(1.5.dp, BgDark, CircleShape)
                    )
                }

                // Search Icon Button
                IconButton(
                    onClick = onSearchClick,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(CardSurface.copy(alpha = 0.8f))
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = TextPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        // Release Radar Bottom Sheet
        if (showReleaseRadar) {
            ReleaseRadarBottomSheet(
                onDismiss = { showReleaseRadar = false },
                seriesList = uiState.latestSeries,
                onSeriesClick = onSeriesClick
            )
        }

        // In-App Auto-Update Dialog
        availableUpdate?.let { updateInfo ->
            AppUpdateDialog(
                updateInfo = updateInfo,
                onDismiss = { availableUpdate = null }
            )
        }

        // Sticky AdMob Home Banner Ad
        AdBanner(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
        )
    }
}

@Composable
fun ContinueWatchingRow(
    items: List<WatchHistoryItem>,
    allSeries: List<Series> = emptyList(),
    onItemClick: (WatchHistoryItem) -> Unit,
    onRemoveClick: (WatchHistoryItem) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp)
    ) {
        // Section Header with Netflix Red Accent Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(3.5.dp)
                    .height(16.dp)
                    .background(Color(0xFFE50914), RoundedCornerShape(2.dp))
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Continue Watching",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                fontSize = 17.sp
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(items, key = { it.episodeId }) { item ->
                ContinueWatchingCard(
                    item = item,
                    allSeries = allSeries,
                    onClick = { onItemClick(item) },
                    onRemove = { onRemoveClick(item) }
                )
            }
        }
    }
}

@Composable
fun ContinueWatchingCard(
    item: WatchHistoryItem,
    allSeries: List<Series> = emptyList(),
    onClick: () -> Unit,
    onRemove: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val matchingSeries = remember(item, allSeries) {
        allSeries.find { s ->
            (!item.seriesId.isNullOrBlank() && (s.id == item.seriesId || s.altId == item.seriesId)) ||
            (!item.seriesTitle.isNullOrBlank() && s.title.equals(item.seriesTitle, ignoreCase = true))
        }
    }

    val resolvedThumbnail = remember(item, matchingSeries) {
        when {
            item.bestThumbnailUrl.isNotBlank() -> item.bestThumbnailUrl
            matchingSeries != null && matchingSeries.bestImageUrl.isNotBlank() -> matchingSeries.bestImageUrl
            matchingSeries != null && matchingSeries.bestBannerUrl.isNotBlank() -> matchingSeries.bestBannerUrl
            else -> ""
        }
    }

    // Auto-heal saved progress locally if thumbnail was missing
    androidx.compose.runtime.LaunchedEffect(resolvedThumbnail) {
        if (resolvedThumbnail.isNotBlank() && item.thumbnail.isNullOrBlank()) {
            sriexplainer.app.data.local.WatchHistoryManager.getInstance(context).saveProgress(
                item.copy(thumbnail = resolvedThumbnail)
            )
        }
    }

    Surface(
        modifier = Modifier
            .width(180.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        color = CardSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
    ) {
        Column {
            // Thumbnail with Play overlay & Progress bar at bottom
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(105.dp)
                    .background(Color.Black)
            ) {
                if (resolvedThumbnail.isNotBlank()) {
                    AsyncImage(
                        model = resolvedThumbnail,
                        contentDescription = item.episodeTitle,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(Color(0xFF2E1065), Color(0xFF0F0A1C))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = item.seriesTitle ?: "SRI EXPLAINER",
                            color = BrandPurpleLight,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }

                // Dark gradient overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.75f))
                            )
                        )
                )

                // Centered Play button
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .align(Alignment.Center)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.65f))
                        .border(1.dp, Color.White.copy(alpha = 0.3f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Resume",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }

                // Top-right Dismiss "✕" icon
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .size(22.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.6f))
                        .clickable(onClick = onRemove),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Remove",
                        tint = TextMuted,
                        modifier = Modifier.size(13.dp)
                    )
                }

                // Red Progress Bar at bottom of thumbnail
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.5.dp)
                        .align(Alignment.BottomCenter)
                        .background(Color.White.copy(alpha = 0.2f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(fraction = (item.percentage.coerceIn(2, 100) / 100f))
                            .background(Color(0xFFE50914))
                    )
                }
            }

            // Episode Metadata details
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp)
            ) {
                Text(
                    text = item.seriesTitle ?: "Series",
                    style = MaterialTheme.typography.bodySmall,
                    color = BrandPurpleLight,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Ep ${item.episodeNumber ?: 1}: ${item.episodeTitle ?: "Episode"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${item.formattedPosition} left off",
                        fontSize = 10.sp,
                        color = TextMuted
                    )
                    Text(
                        text = "${item.percentage}%",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF46D369)
                    )
                }
            }
        }
    }
}
