import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/cache_service.dart';
import '../../../models/series_model.dart';
import '../../home/providers/home_provider.dart';

class MyListNotifier extends StateNotifier<List<SeriesModel>> {
  final Ref _ref;
  final CacheService _cache = CacheService();

  MyListNotifier(this._ref) : super([]) {
    loadMyList();
  }

  Future<void> loadMyList() async {
    final ids = await _cache.getMyListIds();
    if (ids.isEmpty) {
      state = [];
      return;
    }

    final seriesRepo = _ref.read(seriesRepositoryProvider);
    final allSeries = await seriesRepo.getSeriesList();
    state = allSeries.where((s) => ids.contains(s.id)).toList();
  }

  Future<void> toggleSeries(SeriesModel series) async {
    await _cache.toggleMyListLocally(series.id);
    await loadMyList();
  }
}

final myListProvider = StateNotifierProvider<MyListNotifier, List<SeriesModel>>((ref) {
  return MyListNotifier(ref);
});
