import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../../models/series_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/quality_badge.dart';

class TrendingSection extends StatelessWidget {
  final List<SeriesModel> series;

  const TrendingSection({
    super.key,
    required this.series,
  });

  @override
  Widget build(BuildContext context) {
    if (series.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Icon(Icons.local_fire_department_rounded, size: 20, color: AppColors.redAccent),
              SizedBox(width: 6),
              Text(
                'Trending Series',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 220,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: series.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final s = series[index];
              return _buildSeriesCard(context, s, index + 1);
            },
          ),
        ),
        const SizedBox(height: 18),
      ],
    );
  }

  Widget _buildSeriesCard(BuildContext context, SeriesModel s, int rank) {
    return GestureDetector(
      onTap: () {
        context.push('/series/${s.slug}');
      },
      child: Container(
        width: 135,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.surfaceBorder, width: 0.8),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Poster with Rank Number
            Stack(
              children: [
                SizedBox(
                  height: 165,
                  width: double.infinity,
                  child: CachedNetworkImage(
                    imageUrl: s.thumbnail,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(
                      color: AppColors.surfaceElevated,
                      child: const Center(
                        child: Icon(Icons.movie_creation_outlined, color: AppColors.textMuted),
                      ),
                    ),
                  ),
                ),

                // Rank Badge
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: rank <= 3 ? AppColors.vipGold : Colors.black87,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: rank <= 3 ? Colors.black : AppColors.surfaceBorder,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        '$rank',
                        style: TextStyle(
                          color: rank <= 3 ? Colors.black : Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                ),

                // Quality Badge
                Positioned(
                  bottom: 6,
                  right: 6,
                  child: QualityBadge(quality: s.latestEpisodeQuality, fontSize: 8),
                ),
              ],
            ),

            // Title & Genre
            Padding(
              padding: const EdgeInsets.all(6.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    s.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${s.genre} • ${s.episodeCount} Ep',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
