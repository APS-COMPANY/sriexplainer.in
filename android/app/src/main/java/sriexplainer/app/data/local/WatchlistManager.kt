package sriexplainer.app.data.local

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import sriexplainer.app.data.model.Series

class WatchlistManager private constructor(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()

    private val _watchlist = MutableStateFlow<List<Series>>(loadWatchlistFromPrefs())
    val watchlist: StateFlow<List<Series>> = _watchlist.asStateFlow()

    fun isInWatchlist(seriesId: String?): Boolean {
        if (seriesId.isNullOrBlank()) return false
        return _watchlist.value.any { it.id == seriesId || it.altId == seriesId }
    }

    fun toggleWatchlist(series: Series): Boolean {
        return if (isInWatchlist(series.id)) {
            removeFromWatchlist(series.id)
            false
        } else {
            addToWatchlist(series)
            true
        }
    }

    fun addToWatchlist(series: Series) {
        try {
            val currentList = _watchlist.value.toMutableList()
            if (!currentList.any { it.id == series.id }) {
                currentList.add(0, series)
                saveWatchlistToPrefs(currentList)
                _watchlist.value = currentList
            }
        } catch (_: Exception) {}
    }

    fun removeFromWatchlist(seriesId: String) {
        try {
            val currentList = _watchlist.value.toMutableList()
            val removed = currentList.removeAll { it.id == seriesId || it.altId == seriesId }
            if (removed) {
                saveWatchlistToPrefs(currentList)
                _watchlist.value = currentList
            }
        } catch (_: Exception) {}
    }

    private fun loadWatchlistFromPrefs(): List<Series> {
        return try {
            val json = prefs.getString(KEY_WATCHLIST, null) ?: return emptyList()
            val type = object : TypeToken<List<Series>>() {}.type
            gson.fromJson<List<Series>>(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveWatchlistToPrefs(list: List<Series>) {
        try {
            val json = gson.toJson(list)
            prefs.edit().putString(KEY_WATCHLIST, json).apply()
        } catch (_: Exception) {}
    }

    companion object {
        private const val PREFS_NAME = "sriexplainer_watchlist"
        private const val KEY_WATCHLIST = "saved_watchlist"

        @Volatile
        private var INSTANCE: WatchlistManager? = null

        fun getInstance(context: Context): WatchlistManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: WatchlistManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
