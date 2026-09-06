package sriexplainer.app.data.local

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import sriexplainer.app.data.model.WatchHistoryItem

class WatchHistoryManager private constructor(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()

    private val _continueWatching = MutableStateFlow<List<WatchHistoryItem>>(loadHistoryFromPrefs())
    val continueWatching: StateFlow<List<WatchHistoryItem>> = _continueWatching.asStateFlow()

    fun saveProgress(item: WatchHistoryItem) {
        try {
            val historyMap = loadRawHistoryMap().toMutableMap()
            val existing = historyMap[item.episodeId]
            val effectiveThumbnail = if (item.thumbnail.isNullOrBlank()) {
                existing?.thumbnail ?: ""
            } else {
                item.thumbnail
            }
            val toSave = if (effectiveThumbnail != item.thumbnail) item.copy(thumbnail = effectiveThumbnail) else item
            historyMap[item.episodeId] = toSave
            saveRawHistoryMap(historyMap)
            _continueWatching.value = getFilteredContinueWatching(historyMap)
        } catch (_: Exception) {}
    }

    fun getProgress(episodeId: String): WatchHistoryItem? {
        return try {
            val historyMap = loadRawHistoryMap()
            historyMap[episodeId]
        } catch (_: Exception) {
            null
        }
    }

    fun removeProgress(episodeId: String) {
        try {
            val historyMap = loadRawHistoryMap().toMutableMap()
            historyMap.remove(episodeId)
            saveRawHistoryMap(historyMap)
            _continueWatching.value = getFilteredContinueWatching(historyMap)
        } catch (_: Exception) {}
    }

    fun getContinueWatchingList(): List<WatchHistoryItem> {
        return _continueWatching.value
    }

    fun clearAll() {
        try {
            prefs.edit().remove(KEY_HISTORY).apply()
            _continueWatching.value = emptyList()
        } catch (_: Exception) {}
    }

    private fun loadRawHistoryMap(): Map<String, WatchHistoryItem> {
        val json = try { prefs.getString(KEY_HISTORY, null) } catch (_: Exception) { null } ?: return emptyMap()
        return try {
            val type = object : TypeToken<Map<String, WatchHistoryItem>>() {}.type
            gson.fromJson<Map<String, WatchHistoryItem>>(json, type) ?: emptyMap()
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun saveRawHistoryMap(map: Map<String, WatchHistoryItem>) {
        try {
            val json = gson.toJson(map)
            prefs.edit().putString(KEY_HISTORY, json).apply()
        } catch (_: Exception) {}
    }

    private fun getFilteredContinueWatching(map: Map<String, WatchHistoryItem>): List<WatchHistoryItem> {
        return map.values
            .filter { item ->
                // Keep if progress is between 2% and 95% (if over 95% considered completed)
                item.percentage in 2..94 && item.positionSec > 5
            }
            .sortedByDescending { it.updatedAt }
    }

    private fun loadHistoryFromPrefs(): List<WatchHistoryItem> {
        return getFilteredContinueWatching(loadRawHistoryMap())
    }

    companion object {
        private const val PREFS_NAME = "sri_watch_history"
        private const val KEY_HISTORY = "history_items"

        @Volatile
        private var instance: WatchHistoryManager? = null

        fun getInstance(context: Context): WatchHistoryManager {
            return instance ?: synchronized(this) {
                instance ?: WatchHistoryManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
