import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/storage/cache_service.dart';
import '../../../core/config/app_config.dart';
import '../../../models/series_model.dart';

class SeriesRepository {
  final ApiClient _client = ApiClient();
  final CacheService _cache = CacheService();

  Future<List<SeriesModel>> getSeriesList({
    String? genre,
    String? status,
    String? sort,
    int? year,
    String? search,
  }) async {
    Map<String, dynamic> query = {};
    if (genre != null && genre.isNotEmpty && genre != 'All') query['genre'] = genre;
    if (status != null && status.isNotEmpty && status != 'All') query['status'] = status;
    if (sort != null && sort.isNotEmpty) query['sort'] = sort;
    if (year != null) query['year'] = year;
    if (search != null && search.isNotEmpty) query['q'] = search;

    try {
      final response = await _client.get(
        ApiEndpoints.series,
        queryParameters: query.isNotEmpty ? query : null,
      );

      final List rawList = response is List ? response : (response['series'] ?? response['data'] ?? []);
      final seriesList = rawList.map((s) => SeriesModel.fromJson(Map<String, dynamic>.from(s))).toList();

      // Save to local cache for offline viewing if default list
      if (query.isEmpty) {
        await _cache.saveJson(AppConfig.keyCachedSeries, rawList);
      }

      return seriesList;
    } catch (e) {
      // Offline fallback
      final cached = await _cache.getJson(AppConfig.keyCachedSeries);
      if (cached is List && cached.isNotEmpty) {
        return cached.map((s) => SeriesModel.fromJson(Map<String, dynamic>.from(s))).toList();
      }
      rethrow;
    }
  }

  Future<SeriesModel> getSeriesDetail(String slugOrId) async {
    final response = await _client.get(ApiEndpoints.seriesDetail(slugOrId));
    final data = response['series'] ?? response['data'] ?? response;
    return SeriesModel.fromJson(Map<String, dynamic>.from(data));
  }
}
