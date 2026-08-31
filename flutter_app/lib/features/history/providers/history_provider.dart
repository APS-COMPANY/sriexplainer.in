import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/watch_history_model.dart';
import '../data/history_repository.dart';
import '../../home/providers/home_provider.dart';

class HistoryNotifier extends StateNotifier<List<WatchHistoryModel>> {
  final HistoryRepository _repo;

  HistoryNotifier(this._repo) : super([]) {
    loadHistory();
  }

  Future<void> loadHistory() async {
    final list = await _repo.getWatchHistory();
    state = list;
  }

  Future<void> recordProgress({
    required String episodeId,
    required String seriesId,
    required String seriesTitle,
    required String episodeTitle,
    required String thumbnail,
    required int progressSeconds,
    required int durationSeconds,
  }) async {
    await _repo.syncWatchProgress(
      episodeId: episodeId,
      seriesId: seriesId,
      seriesTitle: seriesTitle,
      episodeTitle: episodeTitle,
      thumbnail: thumbnail,
      progressSeconds: progressSeconds,
      durationSeconds: durationSeconds,
    );
    await loadHistory();
  }
}

final historyProvider = StateNotifierProvider<HistoryNotifier, List<WatchHistoryModel>>((ref) {
  final repo = ref.watch(historyRepositoryProvider);
  return HistoryNotifier(repo);
});
