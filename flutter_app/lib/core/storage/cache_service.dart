import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

class CacheService {
  static final CacheService _instance = CacheService._internal();
  factory CacheService() => _instance;
  CacheService._internal();

  SharedPreferences? _prefs;

  Future<SharedPreferences> get prefs async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  // Generic JSON caching
  Future<void> saveJson(String key, dynamic data) async {
    final p = await prefs;
    await p.setString(key, jsonEncode(data));
  }

  Future<dynamic> getJson(String key) async {
    final p = await prefs;
    final val = p.getString(key);
    if (val == null) return null;
    try {
      return jsonDecode(val);
    } catch (_) {
      return null;
    }
  }

  // Watch History & Continue Watching (Local + Synced)
  Future<void> saveLocalWatchProgress({
    required String episodeId,
    required String seriesId,
    required String seriesTitle,
    required String episodeTitle,
    required String thumbnail,
    required int progressSeconds,
    required int durationSeconds,
  }) async {
    final p = await prefs;
    final raw = p.getString(AppConfig.keyWatchHistory);
    Map<String, dynamic> history = {};
    if (raw != null) {
      try {
        history = jsonDecode(raw) as Map<String, dynamic>;
      } catch (_) {}
    }

    history[episodeId] = {
      'episodeId': episodeId,
      'seriesId': seriesId,
      'seriesTitle': seriesTitle,
      'episodeTitle': episodeTitle,
      'thumbnail': thumbnail,
      'progressSeconds': progressSeconds,
      'durationSeconds': durationSeconds,
      'percentage': durationSeconds > 0 ? (progressSeconds / durationSeconds) * 100 : 0,
      'updatedAt': DateTime.now().toIso8601String(),
    };

    await p.setString(AppConfig.keyWatchHistory, jsonEncode(history));
  }

  Future<List<Map<String, dynamic>>> getLocalWatchHistory() async {
    final p = await prefs;
    final raw = p.getString(AppConfig.keyWatchHistory);
    if (raw == null) return [];
    try {
      final Map<String, dynamic> map = jsonDecode(raw);
      final list = map.values.map((v) => Map<String, dynamic>.from(v)).toList();
      list.sort((a, b) => (b['updatedAt'] ?? '').compareTo(a['updatedAt'] ?? ''));
      return list;
    } catch (_) {
      return [];
    }
  }

  // Unlocked Episodes Cache
  Future<void> markEpisodeUnlockedLocally(String episodeId) async {
    final p = await prefs;
    final list = p.getStringList(AppConfig.keyUnlockedEpisodes) ?? [];
    if (!list.contains(episodeId)) {
      list.add(episodeId);
      await p.setStringList(AppConfig.keyUnlockedEpisodes, list);
    }
  }

  Future<bool> isEpisodeUnlockedLocally(String episodeId) async {
    final p = await prefs;
    final list = p.getStringList(AppConfig.keyUnlockedEpisodes) ?? [];
    return list.contains(episodeId);
  }

  // My List
  Future<void> toggleMyListLocally(String seriesId) async {
    final p = await prefs;
    final list = p.getStringList(AppConfig.keyMyList) ?? [];
    if (list.contains(seriesId)) {
      list.remove(seriesId);
    } else {
      list.add(seriesId);
    }
    await p.setStringList(AppConfig.keyMyList, list);
  }

  Future<bool> isInMyList(String seriesId) async {
    final p = await prefs;
    final list = p.getStringList(AppConfig.keyMyList) ?? [];
    return list.contains(seriesId);
  }

  Future<List<String>> getMyListIds() async {
    final p = await prefs;
    return p.getStringList(AppConfig.keyMyList) ?? [];
  }
}
