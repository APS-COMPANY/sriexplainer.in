package sriexplainer.app.data.local

import android.app.Activity
import android.content.Context
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback

object AdConfig {
    const val APP_ID = "ca-app-pub-1260032713613791~4676528986"
    const val HOME_BANNER_ID = "ca-app-pub-1260032713613791/6557576548"

    // Interstitial Video Ad Unit ID
    const val INTERSTITIAL_AD_ID = "ca-app-pub-1260032713613791/1561717388"

    private var interstitialAd: InterstitialAd? = null
    private var isAdLoading = false

    fun loadInterstitialAd(context: Context) {
        if (interstitialAd != null || isAdLoading) return
        isAdLoading = true

        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(
            context.applicationContext,
            INTERSTITIAL_AD_ID,
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    isAdLoading = false
                }

                override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                    interstitialAd = null
                    isAdLoading = false
                }
            }
        )
    }

    fun showInterstitialAd(activity: Activity?, onFinished: () -> Unit) {
        if (activity == null) {
            onFinished()
            return
        }

        activity.runOnUiThread {
            val currentAd = interstitialAd
            if (currentAd != null) {
                currentAd.fullScreenContentCallback = object : FullScreenContentCallback() {
                    override fun onAdDismissedFullScreenContent() {
                        interstitialAd = null
                        loadInterstitialAd(activity)
                        activity.runOnUiThread { onFinished() }
                    }

                    override fun onAdFailedToShowFullScreenContent(adError: com.google.android.gms.ads.AdError) {
                        interstitialAd = null
                        loadInterstitialAd(activity)
                        activity.runOnUiThread { onFinished() }
                    }
                }
                currentAd.show(activity)
            } else {
                // If ad is not ready yet, proceed directly without blocking playback
                loadInterstitialAd(activity)
                onFinished()
            }
        }
    }
}

