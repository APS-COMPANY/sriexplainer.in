package sriexplainer.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch
import sriexplainer.app.data.model.AppUpdateInfo
import sriexplainer.app.ui.theme.*
import sriexplainer.app.util.AppUpdateManager
import sriexplainer.app.util.UpdateDownloadState
import java.io.File
import java.util.Locale

@Composable
fun AppUpdateDialog(
    updateInfo: AppUpdateInfo,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var downloadState by remember { mutableStateOf<UpdateDownloadState>(UpdateDownloadState.Idle) }
    var downloadedFile by remember { mutableStateOf<File?>(null) }

    Dialog(
        onDismissRequest = {
            if (!updateInfo.forceUpdate && downloadState !is UpdateDownloadState.Downloading) {
                onDismiss()
            }
        },
        properties = DialogProperties(
            dismissOnBackPress = !updateInfo.forceUpdate && downloadState !is UpdateDownloadState.Downloading,
            dismissOnClickOutside = !updateInfo.forceUpdate && downloadState !is UpdateDownloadState.Downloading
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = CardSurface),
            border = androidx.compose.foundation.BorderStroke(1.dp, BrandPurple.copy(alpha = 0.35f))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(22.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header Row with Icon & Dismiss (if not forced)
                Box(modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .align(Alignment.Center)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(BrandPurple, Color(0xFFEC4899))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.SystemUpdate,
                            contentDescription = "Update Icon",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    if (!updateInfo.forceUpdate && downloadState !is UpdateDownloadState.Downloading) {
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = TextMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Title & Version Badge
                Text(
                    text = "New Update Available!",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Spacer(modifier = Modifier.height(6.dp))

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = BrandPurple.copy(alpha = 0.18f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandPurple.copy(alpha = 0.4f))
                ) {
                    Text(
                        text = "Version ${updateInfo.versionName}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = BrandPurple,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // What's New Changelog Box
                if (!updateInfo.changeLog.isNullOrBlank()) {
                    Text(
                        text = "What's New in this update:",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 160.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(BgDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .verticalScroll(rememberScrollState())
                        ) {
                            Text(
                                text = updateInfo.changeLog,
                                fontSize = 12.sp,
                                color = TextMuted,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Progress Bar or Status depending on state
                when (val state = downloadState) {
                    is UpdateDownloadState.Idle -> {
                        // Regular buttons
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    val file = AppUpdateManager.downloadApk(
                                        context = context,
                                        downloadUrl = updateInfo.downloadUrl,
                                        onProgress = { newProgress ->
                                            downloadState = newProgress
                                            if (newProgress is UpdateDownloadState.ReadyToInstall) {
                                                downloadedFile = newProgress.file
                                                AppUpdateManager.installApk(context, newProgress.file)
                                            }
                                        }
                                    )
                                    if (file != null) {
                                        downloadedFile = file
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandPurple)
                        ) {
                            Text(
                                text = "Update Now",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        if (!updateInfo.forceUpdate) {
                            Spacer(modifier = Modifier.height(8.dp))
                            TextButton(
                                onClick = onDismiss,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "Later",
                                    fontSize = 13.sp,
                                    color = TextMuted
                                )
                            }
                        }
                    }

                    is UpdateDownloadState.Downloading -> {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            LinearProgressIndicator(
                                progress = { state.progressPercent / 100f },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp)),
                                color = BrandPurple,
                                trackColor = BorderDark
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Downloading update...",
                                    fontSize = 12.sp,
                                    color = TextMuted
                                )
                                Text(
                                    text = "${state.progressPercent}%",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = BrandPurple
                                )
                            }

                            if (state.totalBytes > 0) {
                                val currentMb = state.downloadedBytes / (1024.0 * 1024.0)
                                val totalMb = state.totalBytes / (1024.0 * 1024.0)
                                Text(
                                    text = String.format(Locale.US, "%.1f MB / %.1f MB", currentMb, totalMb),
                                    fontSize = 11.sp,
                                    color = TextMuted.copy(alpha = 0.8f),
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }

                    is UpdateDownloadState.ReadyToInstall -> {
                        Button(
                            onClick = {
                                downloadedFile?.let { file ->
                                    AppUpdateManager.installApk(context, file)
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                        ) {
                            Text(
                                text = "Install Now",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }

                    is UpdateDownloadState.Error -> {
                        Text(
                            text = "Download issue: ${state.message}",
                            fontSize = 12.sp,
                            color = Color(0xFFFF6B6B),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    val fallback = updateInfo.fallbackUrl ?: updateInfo.downloadUrl
                                    AppUpdateManager.openInBrowser(context, fallback)
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.OpenInBrowser,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = TextPrimary
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Browser", fontSize = 12.sp, color = TextPrimary)
                            }

                            Button(
                                onClick = {
                                    downloadState = UpdateDownloadState.Idle
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandPurple)
                            ) {
                                Text("Retry", fontSize = 13.sp, color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}
