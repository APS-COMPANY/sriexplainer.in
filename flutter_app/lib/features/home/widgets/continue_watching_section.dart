import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../../models/watch_history_model.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';

class ContinueWatchingSection extends StatelessWidget {
  final List<WatchHistoryModel> items;

  const ContinueWatchingSection({
    super.key,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Icon(Icons.play_circle_fill_rounded, size: 18, color: AppColors.vipGold),
              SizedBox(width: 8),
              Text(
                'Continue Watching',
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
          height: 145,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final item = items[index];
              return _buildCard(context, item);
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildCard(BuildContext context, WatchHistoryModel item) {
    return GestureDetector(
      onTap: () {
        context.push('/watch/${item.episodeId}?seriesId=${item.seriesId}');
      },
      child: Container(
        width: 190,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.surfaceBorder, width: 0.8),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail with play button overlay
            Stack(
              children: [
                SizedBox(
                  height: 95,
                  width: double.infinity,
                  child: item.thumbnail.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: AppConfig.resolveImageUrl(item.thumbnail),
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => Container(
                            color: AppColors.surfaceElevated,
                            child: const Icon(Icons.movie, color: AppColors.textMuted),
                          ),
                        )
                      : Container(
                          color: AppColors.surfaceElevated,
                          child: const Icon(Icons.movie, color: AppColors.textMuted),
                        ),
                ),
                Positioned.fill(
                  child: Container(
                    color: Colors.black.withOpacity(0.3),
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.vipGold.withOpacity(0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.play_arrow_rounded, size: 20, color: Colors.black),
                      ),
                    ),
                  ),
                ),
                // Progress Bar
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    value: (item.percentage / 100).clamp(0.0, 1.0),
                    backgroundColor: Colors.black45,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.vipGold),
                    minHeight: 3,
                  ),
                ),
              ],
            ),
            // Title & Ep
            Padding(
              padding: const EdgeInsets.all(6.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.seriesTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    item.episodeTitle,
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
