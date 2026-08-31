import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/series_model.dart';
import '../providers/home_provider.dart';

class ExploreState {
  final List<SeriesModel> seriesList;
  final String selectedGenre;
  final String selectedStatus;
  final String searchQuery;
  final String sortBy;
  final bool isLoading;
  final String? error;

  ExploreState({
    this.seriesList = const [],
    this.selectedGenre = 'All',
    this.selectedStatus = 'All',
    this.searchQuery = '',
    this.sortBy = 'latest',
    this.isLoading = false,
    this.error,
  });

  ExploreState copyWith({
    List<SeriesModel>? seriesList,
    String? selectedGenre,
    String? selectedStatus,
    String? searchQuery,
    String? sortBy,
    bool? isLoading,
    String? error,
  }) {
    return ExploreState(
      seriesList: seriesList ?? this.seriesList,
      selectedGenre: selectedGenre ?? this.selectedGenre,
      selectedStatus: selectedStatus ?? this.selectedStatus,
      searchQuery: searchQuery ?? this.searchQuery,
      sortBy: sortBy ?? this.sortBy,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class ExploreNotifier extends StateNotifier<ExploreState> {
  final Ref _ref;

  ExploreNotifier(this._ref) : super(ExploreState()) {
    searchSeries();
  }

  Future<void> searchSeries() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final repo = _ref.read(seriesRepositoryProvider);
      final list = await repo.getSeriesList(
        genre: state.selectedGenre,
        status: state.selectedStatus,
        sort: state.sortBy,
        search: state.searchQuery,
      );
      state = state.copyWith(seriesList: list, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setGenre(String genre) {
    if (state.selectedGenre == genre) return;
    state = state.copyWith(selectedGenre: genre);
    searchSeries();
  }

  void setStatus(String status) {
    if (state.selectedStatus == status) return;
    state = state.copyWith(selectedStatus: status);
    searchSeries();
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
    searchSeries();
  }

  void setSortBy(String sort) {
    if (state.sortBy == sort) return;
    state = state.copyWith(sortBy: sort);
    searchSeries();
  }
}

final exploreProvider = StateNotifierProvider<ExploreNotifier, ExploreState>((ref) {
  return ExploreNotifier(ref);
});
