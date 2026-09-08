package sriexplainer.app

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import coil.request.CachePolicy

class SriExplainerApplication : Application(), ImageLoaderFactory {

    companion object {
        lateinit var instance: SriExplainerApplication
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        sriexplainer.app.data.network.NetworkModule.initialize(this)
        try {
            val testDeviceIds = listOf(
                "EB9D87FCF78741CFB475AB7D706DBFD4",
                "eb9d87fc-f787-41cf-b475-ab7d706dbfd4",
                com.google.android.gms.ads.AdRequest.DEVICE_ID_EMULATOR
            )
            val requestConfig = com.google.android.gms.ads.RequestConfiguration.Builder()
                .setTestDeviceIds(testDeviceIds)
                .build()
            com.google.android.gms.ads.MobileAds.setRequestConfiguration(requestConfig)
            com.google.android.gms.ads.MobileAds.initialize(this) {}
        } catch (_: Exception) {}
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(100L * 1024 * 1024) // 100 MB disk cache
                    .build()
            }
            .memoryCachePolicy(CachePolicy.ENABLED)
            .diskCachePolicy(CachePolicy.ENABLED)
            .respectCacheHeaders(false)
            .crossfade(true)
            .build()
    }
}
