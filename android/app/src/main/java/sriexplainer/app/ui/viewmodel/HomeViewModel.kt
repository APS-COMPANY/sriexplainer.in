package sriexplainer.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import sriexplainer.app.SriExplainerApplication
import sriexplainer.app.data.local.NotificationHelper
import sriexplainer.app.data.local.WatchHistoryManager
import sriexplainer.app.data.model.Series
import sriexplainer.app.data.model.Slide
import sriexplainer.app.data.model.WatchHistoryItem
import sriexplainer.app.data.repository.SeriesRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val slides: List<Slide> = emptyList(),
    val continueWatching: List<WatchHistoryItem> = emptyList(),
    val trendingSeries: List<Series> = emptyList(),
    val popularSeries: List<Series> = emptyList(),
    val latestSeries: List<Series> = emptyList(),
    val upcomingSeries: List<Series> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class HomeViewModel(
    private val repository: SeriesRepository = SeriesRepository()
) : ViewModel() {

    private val historyManager by lazy {
        WatchHistoryManager.getInstance(SriExplainerApplication.instance)
    }

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        // Collect continue watching updates reactively
        viewModelScope.launch {
            try {
                historyManager.continueWatching.collect { items ->
                    _uiState.value = _uiState.value.copy(continueWatching = items)
                }
            } catch (_: Exception) {}
        }
        loadHomeData()
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null,
                continueWatching = historyManager.getContinueWatchingList()
            )

            // Parallel async fetching for maximum performance
            val slidesDeferred = async { repository.getSlides() }
            val latestDeferred = async { repository.getLatestSeries(25) }
            val popularDeferred = async { repository.getPopularSeries(25) }
            val upcomingDeferred = async { repository.getUpcomingSeries(20) }
            val latestEpisodesDeferred = async { repository.getLatestEpisodes() }

            val slidesResult = slidesDeferred.await()
            val latestResult = latestDeferred.await()
            val popularResult = popularDeferred.await()
            val upcomingResult = upcomingDeferred.await()
            val latestEpisodesResult = latestEpisodesDeferred.await()

            val latest = latestResult.getOrDefault(emptyList())
            val popular = popularResult.getOrDefault(emptyList())
            val slides = slidesResult.getOrDefault(emptyList())
            val upcoming = upcomingResult.getOrDefault(emptyList())
            val latestEpisodes = latestEpisodesResult.getOrDefault(emptyList())

            // Check if any new episodes dropped and notify user
            try {
                if (latestEpisodes.isNotEmpty()) {
                    NotificationHelper.checkAndNotifyNewEpisodes(SriExplainerApplication.instance, latestEpisodes)
                }
            } catch (_: Exception) {}

            val trending = popular.filter { it.trending == true }.ifEmpty { popular.take(10) }

            _uiState.value = _uiState.value.copy(
                slides = slides,
                continueWatching = historyManager.getContinueWatchingList(),
                trendingSeries = trending,
                popularSeries = popular,
                latestSeries = latest,
                upcomingSeries = upcoming,
                isLoading = false,
                error = if (latest.isEmpty() && slides.isEmpty()) "Unable to load content. Please check your internet connection." else null
            )
        }
    }

    fun removeContinueWatching(episodeId: String) {
        historyManager.removeProgress(episodeId)
    }
}
