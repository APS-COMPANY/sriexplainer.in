package sriexplainer.app.ui.components

import android.util.Log
import android.view.ViewGroup
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import sriexplainer.app.data.local.AdConfig
import sriexplainer.app.ui.theme.BgDark

@Composable
fun AdBanner(
    modifier: Modifier = Modifier,
    adUnitId: String = AdConfig.HOME_BANNER_ID
) {
    var isAdLoaded by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (isAdLoaded) {
                    Modifier
                        .height(58.dp)
                        .background(BgDark)
                        .border(
                            width = 0.5.dp,
                            color = Color.White.copy(alpha = 0.08f)
                        )
                        .padding(vertical = 4.dp)
                } else {
                    Modifier.height(0.dp)
                }
            ),
        contentAlignment = Alignment.Center
    ) {
        AndroidView(
            modifier = Modifier
                .fillMaxWidth()
                .then(
                    if (isAdLoaded) Modifier.height(50.dp) else Modifier.height(0.dp)
                ),
            factory = { ctx ->
                AdView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                    )
                    setAdSize(AdSize.BANNER)
                    this.adUnitId = adUnitId
                    adListener = object : AdListener() {
                        override fun onAdLoaded() {
                            isAdLoaded = true
                            Log.d("SriExplainerAds", "Banner loaded successfully")
                        }

                        override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                            isAdLoaded = false
                            Log.w("SriExplainerAds", "Banner failed (code ${loadAdError.code}): ${loadAdError.message}")
                        }
                    }
                    try {
                        loadAd(AdRequest.Builder().build())
                    } catch (_: Exception) {}
                }
            }
        )
    }
}


