package sriexplainer.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import sriexplainer.app.data.model.Episode
import sriexplainer.app.data.model.Series
import sriexplainer.app.data.repository.SeriesRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SeriesDetailUiState(
    val series: Series? = null,
    val episodes: List<Episode> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class SeriesDetailViewModel(
    private val repository: SeriesRepository = SeriesRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(SeriesDetailUiState())
    val uiState: StateFlow<SeriesDetailUiState> = _uiState.asStateFlow()

    fun loadSeries(seriesId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val detailResult = repository.getSeriesDetail(seriesId)
            val detailResponse = detailResult.getOrNull()

            var series = detailResponse?.series
            var episodes = detailResponse?.episodes ?: emptyList()

            if (episodes.isEmpty()) {
                val epResult = repository.getEpisodes(seriesId)
                episodes = epResult.getOrElse { emptyList() }
            }

            _uiState.value = SeriesDetailUiState(
                series = series,
                episodes = episodes,
                isLoading = false,
                error = if (series == null && episodes.isEmpty()) "Failed to load series details" else null
            )
        }
    }
}
