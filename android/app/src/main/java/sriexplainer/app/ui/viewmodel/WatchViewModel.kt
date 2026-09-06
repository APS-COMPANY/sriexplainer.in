package sriexplainer.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import sriexplainer.app.data.model.Episode
import sriexplainer.app.data.repository.SeriesRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class WatchUiState(
    val currentEpisode: Episode? = null,
    val seriesEpisodes: List<Episode> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class WatchViewModel(
    private val repository: SeriesRepository = SeriesRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(WatchUiState())
    val uiState: StateFlow<WatchUiState> = _uiState.asStateFlow()

    fun loadEpisode(episodeId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val epResult = repository.getEpisodeDetail(episodeId)
            val episode = epResult.getOrNull()

            if (episode != null) {
                // Record view
                repository.recordView(episodeId)

                // Fetch other episodes of this series for the playlist drawer
                val seriesEpisodes = episode.seriesId?.let { sId ->
                    repository.getEpisodes(sId).getOrElse { emptyList() }
                } ?: emptyList()

                _uiState.value = WatchUiState(
                    currentEpisode = episode,
                    seriesEpisodes = seriesEpisodes,
                    isLoading = false
                )
            } else {
                _uiState.value = WatchUiState(
                    isLoading = false,
                    error = epResult.exceptionOrNull()?.message ?: "Failed to load episode"
                )
            }
        }
    }
}
