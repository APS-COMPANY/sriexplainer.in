import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_state_widget.dart';
import '../../../models/watch_history_model.dart';
import '../providers/history_provider.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Watch History'),
      ),
      body: history.isEmpty
          ? EmptyStateWidget(
              icon: Icons.history_toggle_off_rounded,
              title: 'No Watch History',
              message: 'Your watched episodes and progress will appear here automatically.',
              buttonText: 'Start Watching',
              onAction: () => context.go('/'),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: history.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = history[index];
                return _buildHistoryTile(context, item);
              },
            ),
    );
  }

  Widget _buildHistoryTile(BuildContext context, WatchHistoryModel item) {
    return GestureDetector(
      onTap: () {
        context.push('/watch/${item.episodeId}?seriesId=${item.seriesId}');
      },
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.surfaceBorder, width: 0.8),
        ),
        child: Row(
          children: [
            // Thumbnail with progress
            Stack(
              children: [
                Container(
                  width: 110,
                  height: 65,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: AppColors.surfaceElevated,
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: CachedNetworkImage(
                    imageUrl: item.thumbnail,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => const Center(child: Icon(Icons.movie, color: AppColors.textMuted)),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    value: (item.percentage / 100).clamp(0.0, 1.0),
                    backgroundColor: Colors.black54,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.vipGold),
                    minHeight: 3,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),

            // Text info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.seriesTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.episodeTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${item.percentage.toInt()}% watched • ${DateFormat.MMMd().format(item.updatedAt)}',
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),

            // Play Icon
            const Icon(Icons.play_circle_fill_rounded, color: AppColors.vipGold, size: 26),
          ],
        ),
      ),
    );
  }
}
