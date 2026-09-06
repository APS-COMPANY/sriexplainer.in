package sriexplainer.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import sriexplainer.app.data.model.Series
import sriexplainer.app.data.repository.SeriesRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SearchUiState(
    val query: String = "",
    val selectedGenre: String? = null,
    val results: List<Series> = emptyList(),
    val isSearching: Boolean = false,
    val error: String? = null
)

class SearchViewModel(
    private val repository: SeriesRepository = SeriesRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        // Initial popular series suggestions
        loadInitialSuggestions()
    }

    private fun loadInitialSuggestions() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSearching = true)
            val res = repository.getPopularSeries(30)
            _uiState.value = _uiState.value.copy(
                results = res.getOrDefault(emptyList()),
                isSearching = false
            )
        }
    }

    fun onQueryChanged(newQuery: String) {
        _uiState.value = _uiState.value.copy(query = newQuery)
        triggerSearch()
    }

    fun onGenreSelected(genre: String?) {
        val nextGenre = if (_uiState.value.selectedGenre == genre) null else genre
        _uiState.value = _uiState.value.copy(selectedGenre = nextGenre)
        triggerSearch()
    }

    private fun triggerSearch() {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // 300ms debounce
            val q = _uiState.value.query.trim()
            val genre = _uiState.value.selectedGenre

            _uiState.value = _uiState.value.copy(isSearching = true)

            val result: Result<List<Series>> = if (q.isNotEmpty() || genre != null) {
                repository.searchSeries(query = q, genre = genre)
            } else {
                repository.getPopularSeries(30)
            }

            _uiState.value = _uiState.value.copy(
                results = result.getOrElse { emptyList() },
                isSearching = false,
                error = if (result.isFailure) "Search failed" else null
            )
        }
    }
}
