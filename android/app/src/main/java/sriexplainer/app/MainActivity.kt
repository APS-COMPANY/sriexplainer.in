package sriexplainer.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import sriexplainer.app.ui.navigation.Screen
import sriexplainer.app.ui.navigation.SriExplainerBottomBar
import sriexplainer.app.ui.screens.detail.SeriesDetailScreen
import sriexplainer.app.ui.screens.home.HomeScreen
import sriexplainer.app.ui.screens.profile.ProfileScreen
import sriexplainer.app.ui.screens.search.SearchScreen
import sriexplainer.app.ui.screens.watch.WatchScreen
import sriexplainer.app.ui.theme.BgDark
import sriexplainer.app.ui.theme.SriExplainerTheme

import android.content.Intent
import android.os.Build
import android.content.pm.PackageManager
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import sriexplainer.app.data.local.NotificationHelper

class MainActivity : ComponentActivity() {

    private var pendingEpisodeId by mutableStateOf<String?>(null)

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        try {
            NotificationHelper.initChannel(this)
        } catch (_: Exception) {}
        try {
            checkNotificationPermission()
        } catch (_: Exception) {}
        try {
            handleAuthIntent(intent)
            handleEpisodeNotificationIntent(intent)
        } catch (_: Exception) {}

        setContent {
            SriExplainerTheme {
                MainAppContent(
                    pendingEpisodeId = pendingEpisodeId,
                    onEpisodeHandled = { pendingEpisodeId = null }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        try {
            handleAuthIntent(intent)
            handleEpisodeNotificationIntent(intent)
        } catch (_: Exception) {}
    }

    private fun checkNotificationPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(
                        this,
                        android.Manifest.permission.POST_NOTIFICATIONS
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        } catch (_: Exception) {}
    }

    private fun handleEpisodeNotificationIntent(intent: Intent?) {
        val epId = intent?.getStringExtra("episode_id")
        if (!epId.isNullOrBlank()) {
            pendingEpisodeId = epId
        }
    }

    private fun handleAuthIntent(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme == "sriexplainer" && data.host == "auth") {
            val token = data.getQueryParameter("token")
            if (!token.isNullOrBlank()) {
                lifecycleScope.launch {
                    val sessionManager = sriexplainer.app.data.local.UserSessionManager.getInstance(applicationContext)
                    val repository = sriexplainer.app.data.repository.SeriesRepository()
                    val result = repository.getMe(token)
                    result.fold(
                        onSuccess = { user ->
                            sessionManager.saveSession(token, user)
                            android.widget.Toast.makeText(
                                applicationContext,
                                "Welcome back, ${user.name ?: "VIP Member"}!",
                                android.widget.Toast.LENGTH_LONG
                            ).show()
                        },
                        onFailure = {
                            val user = parseJwtFallback(token)
                            if (user != null) {
                                sessionManager.saveSession(token, user)
                                android.widget.Toast.makeText(
                                    applicationContext,
                                    "Logged in successfully via Google!",
                                    android.widget.Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    )
                }
            }
        }
    }

    private fun parseJwtFallback(token: String): sriexplainer.app.data.model.User? {
        return try {
            val parts = token.split(".")
            if (parts.size >= 2) {
                val payloadJson = String(android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE or android.util.Base64.NO_PADDING or android.util.Base64.NO_WRAP))
                val json = com.google.gson.JsonParser.parseString(payloadJson).asJsonObject
                val id = json.get("userId")?.asString ?: json.get("id")?.asString ?: "user"
                val email = json.get("email")?.asString
                val role = json.get("role")?.asString ?: "user"
                sriexplainer.app.data.model.User(
                    id = id,
                    name = email?.substringBefore("@")?.replaceFirstChar { it.uppercase() } ?: "VIP Member",
                    email = email,
                    role = role
                )
            } else null
        } catch (_: Exception) {
            null
        }
    }
}

@Composable
fun MainAppContent(
    pendingEpisodeId: String? = null,
    onEpisodeHandled: () -> Unit = {}
) {
    val navController = rememberNavController()

    LaunchedEffect(pendingEpisodeId) {
        pendingEpisodeId?.let { epId ->
            navController.navigate(Screen.Watch.createRoute(epId))
            onEpisodeHandled()
        }
    }

    Scaffold(
        bottomBar = { SriExplainerBottomBar(navController) },
        containerColor = BgDark,
        modifier = Modifier.fillMaxSize()
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = innerPadding.calculateBottomPadding())
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    onSeriesClick = { series ->
                        navController.navigate(Screen.SeriesDetail.createRoute(series.id))
                    },
                    onEpisodeClick = { epId ->
                        navController.navigate(Screen.Watch.createRoute(epId))
                    },
                    onSearchClick = {
                        navController.navigate(Screen.Search.route)
                    }
                )
            }

            composable(Screen.Search.route) {
                SearchScreen(
                    onSeriesClick = { series ->
                        navController.navigate(Screen.SeriesDetail.createRoute(series.id))
                    }
                )
            }

            composable(Screen.Profile.route) {
                ProfileScreen()
            }

            composable(
                route = Screen.SeriesDetail.route,
                arguments = listOf(navArgument("seriesId") { type = NavType.StringType })
            ) { backStackEntry ->
                val seriesId = backStackEntry.arguments?.getString("seriesId") ?: ""
                SeriesDetailScreen(
                    seriesId = seriesId,
                    initialSeries = null,
                    onBackClick = { navController.popBackStack() },
                    onEpisodeClick = { episode ->
                        navController.navigate(Screen.Watch.createRoute(episode.id))
                    }
                )
            }

            composable(
                route = Screen.Watch.route,
                arguments = listOf(navArgument("episodeId") { type = NavType.StringType })
            ) { backStackEntry ->
                val episodeId = backStackEntry.arguments?.getString("episodeId") ?: ""
                WatchScreen(
                    episodeId = episodeId,
                    onBackClick = { navController.popBackStack() },
                    onNavigateToEpisode = { nextEpId ->
                        navController.navigate(Screen.Watch.createRoute(nextEpId)) {
                            popUpTo(Screen.Watch.route) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
