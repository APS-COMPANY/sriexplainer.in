package sriexplainer.app.ui.screens.watch

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.compose.BackHandler
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AspectRatio
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import coil.compose.AsyncImage
import sriexplainer.app.data.local.WatchHistoryManager
import sriexplainer.app.data.model.WatchHistoryItem
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import sriexplainer.app.data.local.UserSessionManager
import sriexplainer.app.data.local.WatchlistManager
import sriexplainer.app.data.model.Episode
import sriexplainer.app.data.model.Series
import sriexplainer.app.data.repository.SeriesRepository
import sriexplainer.app.ui.components.CommentsSection
import sriexplainer.app.ui.components.InAppPaymentDialog
import sriexplainer.app.ui.components.SubscriptionBottomSheet
import sriexplainer.app.ui.screens.detail.EpisodeListItem
import sriexplainer.app.ui.screens.profile.LoginBottomSheet
import sriexplainer.app.ui.theme.*
import sriexplainer.app.ui.viewmodel.WatchViewModel

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WatchScreen(
    episodeId: String,
    onBackClick: () -> Unit,
    onNavigateToEpisode: (String) -> Unit = {},
    viewModel: WatchViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity
    val coroutineScope = rememberCoroutineScope()
    val sessionManager = remember { UserSessionManager.getInstance(context) }
    val currentUser by sessionManager.currentUser.collectAsState()
    val repository = remember { SeriesRepository() }
    val watchlistManager = remember { WatchlistManager.getInstance(context) }
    val watchlist by watchlistManager.watchlist.collectAsState()

    val configuration = LocalConfiguration.current
    val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    var isFullscreen by remember { mutableStateOf(false) }
    var customView by remember { mutableStateOf<View?>(null) }
    var customViewCallback by remember { mutableStateOf<WebChromeClient.CustomViewCallback?>(null) }
    var isZoomToFill by remember { mutableStateOf(false) }
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var showSubscriptionSheet by remember { mutableStateOf(false) }
    var activeCheckoutPlan by remember { mutableStateOf<sriexplainer.app.ui.components.CoinPackage?>(null) }
    var showLoginSheet by remember { mutableStateOf(false) }

    var selectedWatchTab by remember { mutableIntStateOf(0) }
    var isLiked by remember { mutableStateOf(false) }
    var isDescriptionExpanded by remember { mutableStateOf(false) }

    val historyManager = remember { WatchHistoryManager.getInstance(context) }
    var currentPositionSec by remember { mutableLongStateOf(0L) }
    var videoDurationSec by remember { mutableLongStateOf(0L) }
    var showResumePill by remember { mutableStateOf(false) }
    var savedResumePosition by remember { mutableLongStateOf(0L) }

    var showAutoPlayOverlay by remember { mutableStateOf(false) }
    var autoPlaySecondsRemaining by remember { mutableIntStateOf(5) }
    var isAutoPlayCancelled by remember { mutableStateOf(false) }

    val episode = uiState.currentEpisode

    val nextEpisode = remember(episode, uiState.seriesEpisodes) {
        if (episode == null) null
        else {
            val higher = uiState.seriesEpisodes
                .filter { (it.number ?: 0) > (episode.number ?: 0) }
                .minByOrNull { it.number ?: 0 }
            higher ?: uiState.seriesEpisodes.firstOrNull { it.id != episode.id }
        }
    }

    LaunchedEffect(episodeId) {
        viewModel.loadEpisode(episodeId)
        isAutoPlayCancelled = false
        showAutoPlayOverlay = false
        val saved = historyManager.getProgress(episodeId)
        if (saved != null && saved.positionSec > 15 && saved.percentage < 92) {
            savedResumePosition = saved.positionSec
            currentPositionSec = saved.positionSec
            videoDurationSec = saved.durationSec
            showResumePill = true
        } else {
            showResumePill = false
            savedResumePosition = 0L
            currentPositionSec = 0L
        }
    }

    // AutoPlay countdown timer
    LaunchedEffect(showAutoPlayOverlay) {
        if (showAutoPlayOverlay && !isAutoPlayCancelled && nextEpisode != null) {
            autoPlaySecondsRemaining = 5
            while (autoPlaySecondsRemaining > 0 && showAutoPlayOverlay && !isAutoPlayCancelled) {
                kotlinx.coroutines.delay(1000L)
                autoPlaySecondsRemaining--
            }
            if (showAutoPlayOverlay && !isAutoPlayCancelled && nextEpisode != null) {
                showAutoPlayOverlay = false
                onNavigateToEpisode(nextEpisode.id)
            }
        }
    }

    // Fallback ticker for watch time while player is open
    LaunchedEffect(episodeId) {
        while (true) {
            kotlinx.coroutines.delay(5000L)
            currentPositionSec += 5
        }
    }

    // Periodic watch progress saving locally & remote sync
    LaunchedEffect(episode, currentPositionSec) {
        if (episode != null && currentPositionSec > 5) {
            val dur = if (videoDurationSec > 0) videoDurationSec else 600L
            val pct = if (dur > 0) ((currentPositionSec.toFloat() / dur.toFloat()) * 100).toInt().coerceIn(0, 100) else 0
            val resolvedThumbnail = when {
                episode.bestThumbnailUrl.isNotBlank() -> episode.bestThumbnailUrl
                !episode.thumbnail.isNullOrBlank() -> sriexplainer.app.data.model.formatImageUrl(episode.thumbnail)
                !episode.seriesThumbnail.isNullOrBlank() -> sriexplainer.app.data.model.formatImageUrl(episode.seriesThumbnail)
                else -> uiState.seriesEpisodes.firstOrNull { it.bestThumbnailUrl.isNotBlank() }?.bestThumbnailUrl
                    ?: historyManager.getProgress(episode.id)?.thumbnail
                    ?: ""
            }
            val item = WatchHistoryItem(
                episodeId = episode.id,
                seriesId = episode.seriesId,
                seriesTitle = episode.seriesTitle ?: "Sri Explainer",
                episodeNumber = episode.number ?: 1,
                episodeTitle = episode.title ?: "Episode ${episode.number ?: 1}",
                thumbnail = resolvedThumbnail,
                positionSec = currentPositionSec,
                durationSec = dur,
                percentage = pct,
                updatedAt = System.currentTimeMillis()
            )
            historyManager.saveProgress(item)

            val token = sessionManager.getToken()
            if (!token.isNullOrBlank()) {
                repository.syncProgress(token, episode.id, currentPositionSec, dur, pct)
            }
        }
    }

    LaunchedEffect(isZoomToFill) {
        webViewRef?.evaluateJavascript("if (window.setZoom) { window.setZoom($isZoomToFill); }", null)
    }

    // Handle back press while in fullscreen or landscape video mode
    BackHandler {
        if (isLandscape) {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } else if (isFullscreen && customView != null) {
            customViewCallback?.onCustomViewHidden()
            customView = null
            isFullscreen = false
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } else {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            onBackClick()
        }
    }

    DisposableEffect(episodeId) {
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            if (episode != null && currentPositionSec > 5) {
                val dur = if (videoDurationSec > 0) videoDurationSec else 600L
                val pct = if (dur > 0) ((currentPositionSec.toFloat() / dur.toFloat()) * 100).toInt().coerceIn(0, 100) else 0
                val resolvedThumbnail = when {
                    episode.bestThumbnailUrl.isNotBlank() -> episode.bestThumbnailUrl
                    !episode.thumbnail.isNullOrBlank() -> sriexplainer.app.data.model.formatImageUrl(episode.thumbnail)
                    !episode.seriesThumbnail.isNullOrBlank() -> sriexplainer.app.data.model.formatImageUrl(episode.seriesThumbnail)
                    else -> uiState.seriesEpisodes.firstOrNull { it.bestThumbnailUrl.isNotBlank() }?.bestThumbnailUrl
                        ?: historyManager.getProgress(episode.id)?.thumbnail
                        ?: ""
                }
                val item = WatchHistoryItem(
                    episodeId = episode.id,
                    seriesId = episode.seriesId,
                    seriesTitle = episode.seriesTitle ?: "Sri Explainer",
                    episodeNumber = episode.number ?: 1,
                    episodeTitle = episode.title ?: "Episode ${episode.number ?: 1}",
                    thumbnail = resolvedThumbnail,
                    positionSec = currentPositionSec,
                    durationSec = dur,
                    percentage = pct,
                    updatedAt = System.currentTimeMillis()
                )
                historyManager.saveProgress(item)
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
    ) {
        if (customView != null) {
            // Native Fullscreen Video View with Exit Button
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                AndroidView(
                    factory = {
                        FrameLayout(context).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            addView(customView)
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Top-Left Floating Back Button to exit fullscreen zoom mode
                IconButton(
                    onClick = {
                        customViewCallback?.onCustomViewHidden()
                        customView = null
                        isFullscreen = false
                        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    },
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .statusBarsPadding()
                        .padding(14.dp)
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.7f))
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Exit Zoom Mode",
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }

                // Bottom-Right SRI EXPLAINER Badge in Native Fullscreen
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomEnd),
                    shape = RoundedCornerShape(topStart = 8.dp),
                    color = Color(0xFF09090D),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.18f))
                ) {
                    Row(
                        modifier = Modifier
                            .height(34.dp)
                            .width(180.dp)
                            .padding(horizontal = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFA855F7))
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "SRI EXPLAINER",
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.8.sp
                        )
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(BgDark)
            ) {
                // In Portrait: Top Navigation Bar with Back button, Series Title & Fullscreen button
                if (!isLandscape) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { onBackClick() },
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.1f))
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Text(
                            text = episode?.seriesTitle ?: "Sri Explainer",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 10.dp)
                        )

                        // Top zoom button removed as requested, using Spacer to keep title centered
                        Spacer(modifier = Modifier.size(38.dp))
                    }

                    // Centered Episode Title & Netflix Chips Header (Above Video)
                    if (episode != null) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .padding(top = 4.dp, bottom = 8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = (episode.seriesTitle ?: "Sri Explainer").uppercase(),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandPurpleLight,
                                letterSpacing = 1.3.sp,
                                textAlign = TextAlign.Center
                            )

                            Spacer(modifier = Modifier.height(4.dp))

                            Text(
                                text = "Episode ${episode.number}: ${episode.title ?: ""}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary,
                                textAlign = TextAlign.Center,
                                fontSize = 18.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            // Centered Netflix Metadata Chips Row
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(Color(0xFFE50914))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "1080P HD",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White
                                    )
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                Text(
                                    text = "98% Match",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF46D369)
                                )

                                Spacer(modifier = Modifier.width(8.dp))

                                Text(
                                    text = "2026",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )

                                Spacer(modifier = Modifier.width(8.dp))

                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(3.dp))
                                        .background(Color.White.copy(alpha = 0.12f))
                                        .padding(horizontal = 5.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "TAMIL AUDIO",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                }

                                if (episode.isVip) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(3.dp))
                                            .background(BrandPurple.copy(alpha = 0.3f))
                                            .border(0.5.dp, BrandPurple, RoundedCornerShape(3.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = "VIP EXCLUSIVE",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = StarGold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // THE VIDEO PLAYER — Down and Centered in Portrait, Fullscreen in Landscape
                Box(
                    modifier = if (isLandscape) {
                        Modifier
                            .fillMaxSize()
                            .background(Color.Black)
                    } else {
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.Black)
                            .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(16.dp))
                            .aspectRatio(16f / 9f)
                    }
                ) {
                    if (episode != null && episode.playableVideoUrl.isNotBlank()) {
                        val videoUrl = episode.playableVideoUrl
                        val connector = if (videoUrl.contains("?")) "&" else "?"
                        val embedHtml = remember(videoUrl) {
                            """
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                                <style>
                                    * { margin: 0; padding: 0; box-sizing: border-box; background-color: #000; }
                                    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; position: relative; }
                                    #rumble-player { 
                                        width: 100%; 
                                        height: 100%; 
                                        border: none; 
                                        display: block; 
                                        transform-origin: center center; 
                                        transition: transform 0.25s ease-in-out; 
                                    }
                                    /* Sleek SRI EXPLAINER Badge Cover over Rumble logo */
                                    .rumble-cover-badge {
                                        position: absolute;
                                        bottom: 0;
                                        right: 0;
                                        height: 30px;
                                        width: 105px;
                                        background: #09090d;
                                        border-top: 1px solid rgba(255, 255, 255, 0.18);
                                        border-left: 1px solid rgba(255, 255, 255, 0.18);
                                        border-top-left-radius: 8px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        gap: 6px;
                                        padding: 0 8px;
                                        z-index: 999999;
                                        pointer-events: all;
                                        cursor: default;
                                        user-select: none;
                                        box-shadow: -2px -2px 10px rgba(0, 0, 0, 0.6);
                                        transition: width 0.2s ease, height 0.2s ease;
                                    }
                                    /* In Landscape Mode: Rumble displays green icon + full 'rumble' text, so expand badge to 180px to completely cover both */
                                    @media (orientation: landscape), (min-aspect-ratio: 16/10), (min-width: 580px) {
                                        .rumble-cover-badge {
                                            width: 180px !important;
                                            height: 34px !important;
                                            padding: 0 14px !important;
                                        }
                                    }
                                    .rumble-cover-badge .pulse-dot {
                                        width: 5px;
                                        height: 5px;
                                        border-radius: 50%;
                                        background: #a855f7;
                                        box-shadow: 0 0 6px #a855f7;
                                    }
                                    .rumble-cover-badge span {
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                        font-size: 9px;
                                        font-weight: 900;
                                        letter-spacing: 0.8px;
                                        color: #ffffff;
                                        text-transform: uppercase;
                                        white-space: nowrap;
                                    }
                                </style>
                            </head>
                            <body>
                                <iframe 
                                    id="rumble-player"
                                    src="${videoUrl}${connector}autoplay=1&rel=0&auto=1" 
                                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture" 
                                    allowfullscreen>
                                </iframe>
                                <div class="rumble-cover-badge" id="brand-cover" onclick="event.stopPropagation();">
                                    <div class="pulse-dot"></div>
                                    <span>SRI EXPLAINER</span>
                                </div>
                                <script>
                                    function updateCover() {
                                        var cover = document.getElementById('brand-cover');
                                        if (!cover) return;
                                        var isWide = window.innerWidth > window.innerHeight || window.innerWidth > 580;
                                        cover.style.width = isWide ? '180px' : '105px';
                                        cover.style.height = isWide ? '34px' : '30px';
                                    }
                                    window.addEventListener('resize', updateCover);
                                    window.addEventListener('orientationchange', function() {
                                        setTimeout(updateCover, 150);
                                    });
                                    updateCover();

                                    window.setZoom = function(zoomed) {
                                        var iframe = document.getElementById('rumble-player');
                                        if (iframe) {
                                            iframe.style.transform = zoomed ? 'scale(1.28)' : 'scale(1)';
                                        }
                                        var cover = document.getElementById('brand-cover');
                                        if (cover) {
                                            var isWide = window.innerWidth > window.innerHeight || window.innerWidth > 580;
                                            cover.style.width = isWide ? (zoomed ? '195px' : '180px') : (zoomed ? '120px' : '105px');
                                        }
                                    };

                                    window.addEventListener('message', function(e) {
                                        try {
                                            var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                                            if (!d) return;
                                            var evt = d.event || d.type || d.action || '';
                                            if (evt === 'ended' || evt === 'playback-ended' || (d.duration > 0 && d.currentTime >= d.duration - 1)) {
                                                if (window.AndroidBridge) {
                                                    window.AndroidBridge.onVideoEnded();
                                                }
                                            }
                                            var curr = Math.round(d.currentTime || d.time || 0);
                                            var dur = Math.round(d.duration || 0);
                                            if (curr > 0 && window.AndroidBridge) {
                                                window.AndroidBridge.onVideoProgress(curr, dur);
                                            }
                                        } catch(err) {}
                                    });
                                </script>
                            </body>
                            </html>
                            """.trimIndent()
                        }

                        AndroidView(
                            factory = { ctx ->
                                WebView(ctx).apply {
                                    webViewRef = this
                                    layoutParams = ViewGroup.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        ViewGroup.LayoutParams.MATCH_PARENT
                                    )
                                    settings.apply {
                                        javaScriptEnabled = true
                                        domStorageEnabled = true
                                        mediaPlaybackRequiresUserGesture = false
                                        loadWithOverviewMode = true
                                        useWideViewPort = true
                                        cacheMode = WebSettings.LOAD_DEFAULT
                                        javaScriptCanOpenWindowsAutomatically = false
                                        setSupportMultipleWindows(false)
                                    }
                                    addJavascriptInterface(
                                        object {
                                            @android.webkit.JavascriptInterface
                                            fun onVideoEnded() {
                                                activity?.runOnUiThread {
                                                    if (nextEpisode != null && !isAutoPlayCancelled) {
                                                        showAutoPlayOverlay = true
                                                        autoPlaySecondsRemaining = 5
                                                    }
                                                }
                                            }

                                            @android.webkit.JavascriptInterface
                                            fun onVideoProgress(currentTimeSec: Long, durationSec: Long) {
                                                activity?.runOnUiThread {
                                                    if (currentTimeSec > 0) currentPositionSec = currentTimeSec
                                                    if (durationSec > 0) videoDurationSec = durationSec
                                                }
                                            }
                                        },
                                        "AndroidBridge"
                                    )
                                    webViewClient = object : WebViewClient() {
                                        override fun shouldOverrideUrlLoading(
                                            view: WebView?,
                                            request: android.webkit.WebResourceRequest?
                                        ): Boolean {
                                            // Only intercept main frame navigation, NEVER block sub-resource video streams
                                            if (request == null || !request.isForMainFrame) {
                                                return false
                                            }
                                            val url = request.url?.toString() ?: ""
                                            if (url.contains("rumble.com") && !url.contains("/embed/")) {
                                                return true
                                            }
                                            if (!url.startsWith("https://sriexplainer.in") && !url.contains("/embed/")) {
                                                return true
                                            }
                                            return false
                                        }
                                    }
                                    webChromeClient = object : WebChromeClient() {
                                        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                                            super.onShowCustomView(view, callback)
                                            customView = view
                                            customViewCallback = callback
                                            isFullscreen = true
                                            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                                        }

                                        override fun onHideCustomView() {
                                            super.onHideCustomView()
                                            customView = null
                                            customViewCallback = null
                                            isFullscreen = false
                                            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                                        }
                                    }
                                    loadDataWithBaseURL("https://sriexplainer.in", embedHtml, "text/html", "UTF-8", null)
                                }
                            },
                            update = { wv ->
                                webViewRef = wv
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    } else if (uiState.isLoading) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = BrandPurple, modifier = Modifier.size(36.dp))
                        }
                    } else {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                text = uiState.error ?: "Video unavailable",
                                color = TextMuted,
                                fontSize = 13.sp
                            )
                        }
                    }

                    // Over-Video Controls
                    if (isLandscape) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .align(Alignment.TopCenter)
                                .statusBarsPadding()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = {
                                    activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                                },
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.65f))
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                if (nextEpisode != null) {
                                    IconButton(
                                        onClick = {
                                            showAutoPlayOverlay = true
                                            autoPlaySecondsRemaining = 5
                                        },
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(Color.Black.copy(alpha = 0.65f))
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.SkipNext,
                                            contentDescription = "Next Episode",
                                            tint = Color.White,
                                            modifier = Modifier.size(22.dp)
                                        )
                                    }
                                }

                                // Zoom Mode Toggle Pill (Fit 16:9 vs Fill Screen)
                                Surface(
                                    onClick = {
                                        isZoomToFill = !isZoomToFill
                                    },
                                    shape = RoundedCornerShape(20.dp),
                                    color = if (isZoomToFill) BrandPurple else Color.Black.copy(alpha = 0.7f),
                                    border = BorderStroke(1.dp, if (isZoomToFill) BrandPurpleLight else Color.White.copy(alpha = 0.25f))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.AspectRatio,
                                            contentDescription = "Zoom Mode",
                                            tint = Color.White,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Text(
                                            text = if (isZoomToFill) "Zoom: Fill Screen" else "Zoom: Fit (16:9)",
                                            color = Color.White,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }

                                IconButton(
                                    onClick = {
                                        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                                    },
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(Color.Black.copy(alpha = 0.65f))
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.FullscreenExit,
                                        contentDescription = "Exit Fullscreen",
                                        tint = Color.White,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }
                        }

                        // Bottom-Right SRI EXPLAINER Badge in Landscape Mode (covers green logo + 'rumble' text)
                        Surface(
                            modifier = Modifier
                                .align(Alignment.BottomEnd),
                            shape = RoundedCornerShape(topStart = 8.dp),
                            color = Color(0xFF09090D),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.18f))
                        ) {
                            Row(
                                modifier = Modifier
                                    .height(34.dp)
                                    .width(180.dp)
                                    .padding(horizontal = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(5.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFA855F7))
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "SRI EXPLAINER",
                                    color = Color.White,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    letterSpacing = 0.8.sp
                                )
                            }
                        }
                    } else {
                        // Portrait: Floating Controls at Top-Right of video (Skip Next & Fullscreen)
                        Row(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (nextEpisode != null) {
                                IconButton(
                                    onClick = {
                                        showAutoPlayOverlay = true
                                        autoPlaySecondsRemaining = 5
                                    },
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(Color.Black.copy(alpha = 0.6f))
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.SkipNext,
                                        contentDescription = "Next Episode",
                                        tint = Color.White,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            IconButton(
                                onClick = {
                                    activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                                },
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.6f))
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Fullscreen,
                                    contentDescription = "Enter Fullscreen Zoom",
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }

                    // Floating "Resume from MM:SS" Pill
                    if (showResumePill && savedResumePosition > 15) {
                        Surface(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(start = 12.dp, bottom = 42.dp),
                            shape = RoundedCornerShape(20.dp),
                            color = Color.Black.copy(alpha = 0.85f),
                            border = BorderStroke(1.dp, BrandPurpleLight.copy(alpha = 0.6f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    tint = StarGold,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "Resume from ${WatchHistoryItem(episodeId = "", positionSec = savedResumePosition).formattedPosition}",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.clickable {
                                        showResumePill = false
                                        webViewRef?.evaluateJavascript(
                                            "var ifr = document.getElementById('rumble-player'); if (ifr) { ifr.src = ifr.src + '&start=$savedResumePosition'; }",
                                            null
                                        )
                                        Toast.makeText(context, "Resumed from ${WatchHistoryItem(episodeId = "", positionSec = savedResumePosition).formattedPosition}", Toast.LENGTH_SHORT).show()
                                    }
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Dismiss",
                                    tint = TextMuted,
                                    modifier = Modifier
                                        .size(14.dp)
                                        .clickable { showResumePill = false }
                                )
                            }
                        }
                    }

                    // Netflix-Style Auto-Play Next Episode Overlay (5s Countdown)
                    if (showAutoPlayOverlay && nextEpisode != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.88f))
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF140D24)),
                                border = BorderStroke(1.5.dp, BrandPurple.copy(alpha = 0.8f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(18.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Text(
                                            text = "UP NEXT IN ",
                                            color = TextMuted,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            letterSpacing = 1.sp
                                        )
                                        Text(
                                            text = "${autoPlaySecondsRemaining}s",
                                            color = BrandPurpleLight,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.ExtraBold
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    // Next Episode Preview Box
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Color.Black.copy(alpha = 0.5f))
                                            .padding(8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(width = 80.dp, height = 48.dp)
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(Color.DarkGray)
                                        ) {
                                            AsyncImage(
                                                model = nextEpisode.bestThumbnailUrl,
                                                contentDescription = nextEpisode.title,
                                                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                                modifier = Modifier.fillMaxSize()
                                            )
                                        }

                                        Spacer(modifier = Modifier.width(10.dp))

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "Episode ${nextEpisode.number ?: 1}",
                                                color = BrandPurpleLight,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = nextEpisode.title ?: "Next Episode",
                                                color = Color.White,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))

                                    // Action Buttons: Cancel and Play Now
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        OutlinedButton(
                                            onClick = {
                                                showAutoPlayOverlay = false
                                                isAutoPlayCancelled = true
                                            },
                                            modifier = Modifier.weight(1f),
                                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.4f)),
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                                        ) {
                                            Text("Cancel", fontSize = 13.sp)
                                        }

                                        Button(
                                            onClick = {
                                                showAutoPlayOverlay = false
                                                onNavigateToEpisode(nextEpisode.id)
                                            },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandPurple)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.PlayArrow,
                                                contentDescription = null,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Play Now", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // If not landscape, render Action buttons, Synopsis, VIP card & Episodes list below the centered video
                if (!isLandscape) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                    ) {
                        if (episode != null) {
                            item {
                                Column(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    // 4-Action Quick Row (My List, Rate, Download, Share)
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 10.dp),
                                        horizontalArrangement = Arrangement.SpaceAround,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        val isInWatchlist = watchlist.any { it.id == episode.seriesId }
                                        NetflixActionItem(
                                            icon = if (isInWatchlist) Icons.Default.Check else Icons.Default.Add,
                                            label = if (isInWatchlist) "In List" else "My List",
                                            isActive = isInWatchlist,
                                            onClick = {
                                                val seriesId = episode.seriesId ?: episode.id
                                                val series = Series(
                                                    id = seriesId,
                                                    title = episode.seriesTitle ?: "Series",
                                                    thumbnail = episode.seriesThumbnail ?: episode.thumbnail,
                                                    banner = episode.seriesThumbnail ?: episode.thumbnail
                                                )
                                                val added = watchlistManager.toggleWatchlist(series)
                                                val msg = if (added) "Added to My Watchlist" else "Removed from Watchlist"
                                                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                            }
                                        )

                                        NetflixActionItem(
                                            icon = Icons.Default.ThumbUp,
                                            label = if (isLiked) "Liked" else "Rate",
                                            isActive = isLiked,
                                            onClick = {
                                                isLiked = !isLiked
                                                val msg = if (isLiked) "Added to your likes" else "Like removed"
                                                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                            }
                                        )

                                        NetflixActionItem(
                                            icon = Icons.Default.Download,
                                            label = "Download",
                                            isActive = false,
                                            onClick = {
                                                Toast.makeText(context, "VIP Offline Download: Available in next update!", Toast.LENGTH_SHORT).show()
                                            }
                                        )

                                        NetflixActionItem(
                                            icon = Icons.Default.Share,
                                            label = "Share",
                                            isActive = false,
                                            onClick = {
                                                val sendIntent = Intent().apply {
                                                    action = Intent.ACTION_SEND
                                                    putExtra(
                                                        Intent.EXTRA_TEXT,
                                                        "Watch ${episode.seriesTitle ?: "Sri Explainer"} - Episode ${episode.number} in Tamil on Sri Explainer: https://sriexplainer.in/watch/${episode.id}"
                                                    )
                                                    type = "text/plain"
                                                }
                                                val shareIntent = Intent.createChooser(sendIntent, "Share Episode")
                                                context.startActivity(shareIntent)
                                            }
                                        )
                                    }

                                    // Expandable Synopsis Description
                                    if (!episode.description.isNullOrBlank()) {
                                        Spacer(modifier = Modifier.height(14.dp))
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable { isDescriptionExpanded = !isDescriptionExpanded }
                                        ) {
                                            Text(
                                                text = episode.description,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = TextSecondary,
                                                maxLines = if (isDescriptionExpanded) Int.MAX_VALUE else 3,
                                                overflow = TextOverflow.Ellipsis,
                                                lineHeight = 20.sp
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = if (isDescriptionExpanded) "Show less" else "...more",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = TextPrimary
                                            )
                                        }
                                    }

                                    // VIP Subscriptions & Cashfree / Paytm Banner
                                    Spacer(modifier = Modifier.height(18.dp))
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(14.dp))
                                            .background(
                                                Brush.linearGradient(
                                                    listOf(
                                                        Color(0xFF1F1235),
                                                        Color(0xFF140D24)
                                                    )
                                                )
                                            )
                                            .border(1.dp, BrandPurple.copy(alpha = 0.6f), RoundedCornerShape(14.dp))
                                            .clickable { showSubscriptionSheet = true }
                                            .padding(14.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(40.dp)
                                                        .clip(CircleShape)
                                                        .background(BrandPurple.copy(alpha = 0.3f)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Diamond,
                                                        contentDescription = null,
                                                        tint = StarGold,
                                                        modifier = Modifier.size(22.dp)
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(12.dp))
                                                Column {
                                                    Text(
                                                        text = "Get VIP Access & Coins",
                                                        fontSize = 14.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = TextPrimary
                                                    )
                                                    Text(
                                                        text = "Paytm UPI & Cashfree (from ₹29)",
                                                        fontSize = 11.sp,
                                                        color = BrandPurpleLight
                                                    )
                                                }
                                            }

                                            Button(
                                                onClick = { showSubscriptionSheet = true },
                                                colors = ButtonDefaults.buttonColors(containerColor = BrandPurple),
                                                shape = RoundedCornerShape(8.dp),
                                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                            ) {
                                                Text(
                                                    text = "Subscribe",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White
                                                )
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(20.dp))
                                    HorizontalDivider(color = BorderDark, thickness = 1.dp)
                                    Spacer(modifier = Modifier.height(16.dp))

                                    // Tabs: Episodes vs Discussion
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        // Episodes Tab
                                        Column(
                                            modifier = Modifier
                                                .clickable { selectedWatchTab = 0 }
                                                .padding(vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = "EPISODES (${uiState.seriesEpisodes.size})",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (selectedWatchTab == 0) TextPrimary else TextMuted,
                                                letterSpacing = 0.5.sp
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Box(
                                                modifier = Modifier
                                                    .width(44.dp)
                                                    .height(3.dp)
                                                    .background(
                                                        if (selectedWatchTab == 0) Color(0xFFE50914) else Color.Transparent,
                                                        RoundedCornerShape(2.dp)
                                                    )
                                            )
                                        }

                                        // Discussion Tab
                                        Column(
                                            modifier = Modifier
                                                .clickable { selectedWatchTab = 1 }
                                                .padding(vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = "DISCUSSION 💬",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (selectedWatchTab == 1) TextPrimary else TextMuted,
                                                letterSpacing = 0.5.sp
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Box(
                                                modifier = Modifier
                                                    .width(44.dp)
                                                    .height(3.dp)
                                                    .background(
                                                        if (selectedWatchTab == 1) BrandPurple else Color.Transparent,
                                                        RoundedCornerShape(2.dp)
                                                    )
                                            )
                                        }
                                    }
                                }
                            }

                            if (selectedWatchTab == 0) {
                                // List of episodes
                                val otherEpisodes = uiState.seriesEpisodes.filter { it.id != episode.id }
                                items(otherEpisodes, key = { it.id }) { ep ->
                                    EpisodeListItem(
                                        episode = ep,
                                        onClick = { onNavigateToEpisode(ep.id) }
                                    )
                                }
                            } else {
                                // Discussion & Comments Thread
                                item {
                                    CommentsSection(
                                        episodeId = episode.id,
                                        token = sessionManager.getToken(),
                                        isLoggedIn = currentUser != null,
                                        currentUserName = currentUser?.name,
                                        onLoginRequired = { showLoginSheet = true }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Subscription & Cashfree / Paytm Bottom Sheet
        if (showSubscriptionSheet) {
            SubscriptionBottomSheet(
                onDismiss = { showSubscriptionSheet = false },
                userXpCoins = currentUser?.xpCoins ?: 0,
                isLoggedIn = currentUser != null,
                onLoginRequired = {
                    showSubscriptionSheet = false
                    showLoginSheet = true
                },
                onPlanSelected = { pkg ->
                    activeCheckoutPlan = pkg
                }
            )
        }

        // In-App Cashfree & Paytm Checkout Dialog
        if (activeCheckoutPlan != null) {
            val plan = activeCheckoutPlan!!
            InAppPaymentDialog(
                planKey = plan.key,
                amount = plan.price,
                token = sessionManager.getToken(),
                onDismiss = { activeCheckoutPlan = null },
                onPaymentSuccess = {
                    activeCheckoutPlan = null
                    coroutineScope.launch {
                        val token = sessionManager.getToken()
                        if (!token.isNullOrBlank()) {
                            repository.getMe(token).onSuccess { updatedUser ->
                                sessionManager.saveSession(token, updatedUser)
                            }
                        }
                        viewModel.loadEpisode(episodeId)
                        Toast.makeText(context, "🎉 Payment Successful! XP Coins added to your account.", Toast.LENGTH_LONG).show()
                    }
                }
            )
        }

        // In-App Login Bottom Sheet
        if (showLoginSheet) {
            LoginBottomSheet(
                onDismiss = { showLoginSheet = false },
                onLoginSuccess = { token, user ->
                    sessionManager.saveSession(token, user)
                    showLoginSheet = false
                    viewModel.loadEpisode(episodeId)
                    Toast.makeText(context, "Welcome back, ${user.name ?: "VIP Member"}!", Toast.LENGTH_SHORT).show()
                },
                repository = repository
            )
        }
    }
}

@Composable
private fun NetflixActionItem(
    icon: ImageVector,
    label: String,
    isActive: Boolean = false,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isActive) BrandPurpleLight else TextPrimary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
            color = if (isActive) BrandPurpleLight else TextSecondary
        )
    }
}
