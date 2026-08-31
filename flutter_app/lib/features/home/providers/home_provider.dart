import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/series_model.dart';
import '../../../models/episode_model.dart';
import '../../../models/watch_history_model.dart';
import '../../series/data/series_repository.dart';
import '../../episode/data/episode_repository.dart';
import '../../history/data/history_repository.dart';

final seriesRepositoryProvider = Provider<SeriesRepository>((ref) => SeriesRepository());
final episodeRepositoryProvider = Provider<EpisodeRepository>((ref) => EpisodeRepository());
final historyRepositoryProvider = Provider<HistoryRepository>((ref) => HistoryRepository());

class HomeState {
  final List<SeriesModel> featured;
  final List<SeriesModel> trending;
  final List<EpisodeModel> latestEpisodes;
  final List<EpisodeModel> upcomingEpisodes;
  final List<WatchHistoryModel> continueWatching;
  final bool isLoading;
  final String? error;

  HomeState({
    this.featured = const [],
    this.trending = const [],
    this.latestEpisodes = const [],
    this.upcomingEpisodes = const [],
    this.continueWatching = const [],
    this.isLoading = false,
    this.error,
  });

  HomeState copyWith({
    List<SeriesModel>? featured,
    List<SeriesModel>? trending,
    List<EpisodeModel>? latestEpisodes,
    List<EpisodeModel>? upcomingEpisodes,
    List<WatchHistoryModel>? continueWatching,
    bool? isLoading,
    String? error,
  }) {
    return HomeState(
      featured: featured ?? this.featured,
      trending: trending ?? this.trending,
      latestEpisodes: latestEpisodes ?? this.latestEpisodes,
      upcomingEpisodes: upcomingEpisodes ?? this.upcomingEpisodes,
      continueWatching: continueWatching ?? this.continueWatching,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class HomeNotifier extends StateNotifier<HomeState> {
  final SeriesRepository _seriesRepo;
  final EpisodeRepository _episodeRepo;
  final HistoryRepository _historyRepo;

  HomeNotifier(this._seriesRepo, this._episodeRepo, this._historyRepo) : super(HomeState()) {
    loadHomeData();
  }

  Future<void> loadHomeData({bool refresh = false}) async {
    if (state.featured.isNotEmpty && !refresh) return;

    state = state.copyWith(isLoading: true, error: null);

    try {
      final results = await Future.wait([
        _seriesRepo.getSeriesList(),
        _episodeRepo.getLatestEpisodes(limit: 15),
        _episodeRepo.getUpcomingEpisodes(),
        _historyRepo.getContinueWatching(),
      ]);

      final allSeries = results[0] as List<SeriesModel>;
      final latest = results[1] as List<EpisodeModel>;
      final upcoming = results[2] as List<EpisodeModel>;
      final continueWatch = results[3] as List<WatchHistoryModel>;

      final featured = allSeries.where((s) => s.featured || s.views > 100).take(5).toList();
      final trending = allSeries.where((s) => s.trending || s.views > 50).toList();

      state = state.copyWith(
        featured: featured.isNotEmpty ? featured : allSeries.take(5).toList(),
        trending: trending.isNotEmpty ? trending : allSeries,
        latestEpisodes: latest,
        upcomingEpisodes: upcoming,
        continueWatching: continueWatch,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final homeProvider = StateNotifierProvider<HomeNotifier, HomeState>((ref) {
  final seriesRepo = ref.watch(seriesRepositoryProvider);
  final episodeRepo = ref.watch(episodeRepositoryProvider);
  final historyRepo = ref.watch(historyRepositoryProvider);
  return HomeNotifier(seriesRepo, episodeRepo, historyRepo);
});
