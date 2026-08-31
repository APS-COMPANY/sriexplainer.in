import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/series_model.dart';
import '../../home/providers/home_provider.dart';

class ExploreState {
  final List<SeriesModel> seriesList;
  final bool isLoading;
  final String? error;
  final String selectedGenre;
  final String selectedStatus;
  final String sortBy;
  final String searchQuery;

  ExploreState({
    this.seriesList = const [],
    this.isLoading = false,
    this.error,
    this.selectedGenre = 'All',
    this.selectedStatus = 'All',
    this.sortBy = 'latest',
    this.searchQuery = '',
  });

  ExploreState copyWith({
    List<SeriesModel>? seriesList,
    bool? isLoading,
    String? error,
    String? selectedGenre,
    String? selectedStatus,
    String? sortBy,
    String? searchQuery,
  }) {
    return ExploreState(
      seriesList: seriesList ?? this.seriesList,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedGenre: selectedGenre ?? this.selectedGenre,
      selectedStatus: selectedStatus ?? this.selectedStatus,
      sortBy: sortBy ?? this.sortBy,
      searchQuery: searchQuery ?? this.searchQuery,
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
        genre: state.selectedGenre == 'All' ? null : state.selectedGenre,
        status: state.selectedStatus == 'All' ? null : state.selectedStatus,
        sort: state.sortBy,
        search: state.searchQuery.isEmpty ? null : state.searchQuery,
      );
      state = state.copyWith(seriesList: list, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setGenre(String genre) {
    state = state.copyWith(selectedGenre: genre);
    searchSeries();
  }

  void setStatus(String status) {
    state = state.copyWith(selectedStatus: status);
    searchSeries();
  }

  void setSortBy(String sort) {
    state = state.copyWith(sortBy: sort);
    searchSeries();
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
    searchSeries();
  }
}

final exploreProvider = StateNotifierProvider<ExploreNotifier, ExploreState>((ref) {
  return ExploreNotifier(ref);
});
