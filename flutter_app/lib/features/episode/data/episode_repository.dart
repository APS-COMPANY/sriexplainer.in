import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/storage/cache_service.dart';
import '../../../models/episode_model.dart';

class EpisodeRepository {
  final ApiClient _client = ApiClient();
  final CacheService _cache = CacheService();

  Future<List<EpisodeModel>> getLatestEpisodes({int limit = 20}) async {
    final response = await _client.get(
      ApiEndpoints.episodes,
      queryParameters: {'limit': limit},
    );

    final List rawList = response is List ? response : (response['episodes'] ?? response['data'] ?? []);
    return rawList.map((e) => EpisodeModel.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  Future<List<EpisodeModel>> getUpcomingEpisodes() async {
    final response = await _client.get(ApiEndpoints.upcoming);
    final List rawList = response is List ? response : (response['episodes'] ?? response['upcoming'] ?? response['data'] ?? []);
    return rawList.map((e) => EpisodeModel.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  Future<EpisodeModel> getEpisodeDetail(String id) async {
    final response = await _client.get(ApiEndpoints.episodeDetail(id));
    final data = response['episode'] ?? response['data'] ?? response;
    final ep = EpisodeModel.fromJson(Map<String, dynamic>.from(data));

    // Check if unlocked locally
    final isUnlockedLocally = await _cache.isEpisodeUnlockedLocally(ep.id);
    if (isUnlockedLocally) {
      return ep.copyWith(isUnlocked: true);
    }
    return ep;
  }

  Future<Map<String, dynamic>> unlockEpisodeWithXp(String id) async {
    final response = await _client.post(ApiEndpoints.episodeUnlock(id));
    // Cache local unlock state upon successful server confirmation
    await _cache.markEpisodeUnlockedLocally(id);
    return Map<String, dynamic>.from(response);
  }

  Future<void> sendHype(String id) async {
    try {
      await _client.post(ApiEndpoints.episodeHype(id));
    } catch (_) {}
  }

  Future<void> likeEpisode(String id) async {
    try {
      await _client.post(ApiEndpoints.episodeLike(id));
    } catch (_) {}
  }

  Future<void> recordView(String id) async {
    try {
      await _client.post(ApiEndpoints.episodeView(id));
    } catch (_) {}
  }
}
