package sriexplainer.app.data.network

import android.content.Context
import com.google.gson.*
import okhttp3.Cache
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.File
import java.lang.reflect.Type
import java.util.concurrent.TimeUnit

object NetworkModule {
    private const val BASE_URL = "https://sriexplainer.in/"
    private var client: OkHttpClient? = null
    private var apiService: SriExplainerApi? = null

    private val booleanAdapter = object : JsonDeserializer<Boolean> {
        override fun deserialize(json: JsonElement?, typeOfT: Type?, context: JsonDeserializationContext?): Boolean {
            if (json == null || json.isJsonNull) return false
            return try {
                if (json.asJsonPrimitive.isBoolean) {
                    json.asBoolean
                } else if (json.asJsonPrimitive.isNumber) {
                    json.asInt != 0
                } else if (json.asJsonPrimitive.isString) {
                    val s = json.asString.trim().lowercase()
                    s == "true" || s == "1"
                } else {
                    false
                }
            } catch (_: Exception) {
                false
            }
        }
    }

    private val gson: Gson = GsonBuilder()
        .registerTypeAdapter(Boolean::class.java, booleanAdapter)
        .registerTypeAdapter(java.lang.Boolean::class.java, booleanAdapter)
        .create()

    fun initialize(context: Context) {
        if (client == null) {
            val cacheDir = File(context.cacheDir, "http_cache")
            val cache = Cache(cacheDir, 20L * 1024 * 1024) // 20 MB HTTP Cache

            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }

            val okHttpClient = OkHttpClient.Builder()
                .cache(cache)
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                        .header("User-Agent", "SriExplainerAndroid/1.0.0 (Linux; Android)")
                        .header("Accept", "application/json")
                        .build()
                    chain.proceed(request)
                }
                .addInterceptor(logging)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build()

            client = okHttpClient

            val retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build()

            apiService = retrofit.create(SriExplainerApi::class.java)
        }
    }

    val api: SriExplainerApi
        get() = apiService ?: throw IllegalStateException("NetworkModule must be initialized in Application.onCreate")
}
