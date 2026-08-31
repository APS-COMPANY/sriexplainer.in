import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/series_model.dart';
import '../../home/providers/home_provider.dart';
import '../../../core/storage/cache_service.dart';

final seriesDetailProvider = FutureProvider.family<SeriesModel, String>((ref, slugOrId) async {
  final repo = ref.watch(seriesRepositoryProvider);
  final series = await repo.getSeriesDetail(slugOrId);
  return series;
});

final isSavedInMyListProvider = FutureProvider.family<bool, String>((ref, seriesId) async {
  return await CacheService().isInMyList(seriesId);
});
