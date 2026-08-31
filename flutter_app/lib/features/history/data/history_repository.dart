import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/storage/cache_service.dart';
import '../../../models/watch_history_model.dart';

class HistoryRepository {
  final ApiClient _client = ApiClient();
  final CacheService _cache = CacheService();

  Future<List<WatchHistoryModel>> getContinueWatching() async {
    try {
      final response = await _client.get(ApiEndpoints.continueWatching);
      final List rawList = response is List ? response : (response['history'] ?? response['data'] ?? []);
      if (rawList.isNotEmpty) {
        return rawList.map((h) => WatchHistoryModel.fromJson(Map<String, dynamic>.from(h))).toList();
      }
    } catch (_) {}

    // Fallback to local offline cache
    final local = await _cache.getLocalWatchHistory();
    return local.map((h) => WatchHistoryModel.fromJson(h)).toList();
  }

  Future<List<WatchHistoryModel>> getWatchHistory() async {
    try {
      final response = await _client.get(ApiEndpoints.history);
      final List rawList = response is List ? response : (response['history'] ?? response['data'] ?? []);
      if (rawList.isNotEmpty) {
        return rawList.map((h) => WatchHistoryModel.fromJson(Map<String, dynamic>.from(h))).toList();
      }
    } catch (_) {}

    final local = await _cache.getLocalWatchHistory();
    return local.map((h) => WatchHistoryModel.fromJson(h)).toList();
  }

  Future<void> syncWatchProgress({
    required String episodeId,
    required String seriesId,
    required String seriesTitle,
    required String episodeTitle,
    required String thumbnail,
    required int progressSeconds,
    required int durationSeconds,
  }) async {
    // Save to local cache first
    await _cache.saveLocalWatchProgress(
      episodeId: episodeId,
      seriesId: seriesId,
      seriesTitle: seriesTitle,
      episodeTitle: episodeTitle,
      thumbnail: thumbnail,
      progressSeconds: progressSeconds,
      durationSeconds: durationSeconds,
    );

    // Sync with backend API
    try {
      await _client.post(
        ApiEndpoints.historyProgress,
        data: {
          'episodeId': episodeId,
          'seriesId': seriesId,
          'progress': progressSeconds,
          'duration': durationSeconds,
        },
      );
    } catch (_) {}
  }
}
