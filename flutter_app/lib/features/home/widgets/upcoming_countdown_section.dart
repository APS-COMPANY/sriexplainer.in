import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../models/episode_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/countdown_timer_widget.dart';

class UpcomingCountdownSection extends StatelessWidget {
  final List<EpisodeModel> upcoming;

  const UpcomingCountdownSection({
    super.key,
    required this.upcoming,
  });

  @override
  Widget build(BuildContext context) {
    if (upcoming.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Icon(Icons.schedule_rounded, size: 19, color: AppColors.vipGold),
              SizedBox(width: 6),
              Text(
                'Upcoming Releases',
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
          height: 190,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: upcoming.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final ep = upcoming[index];
              return _buildUpcomingCard(context, ep);
            },
          ),
        ),
        const SizedBox(height: 18),
      ],
    );
  }

  Widget _buildUpcomingCard(BuildContext context, EpisodeModel ep) {
    final releaseDate = ep.releaseDateTime ?? DateTime.now().add(const Duration(hours: 6));

    return Container(
      width: 220,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceBorder, width: 0.8),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail with Countdown Badge
          Stack(
            children: [
              SizedBox(
                height: 110,
                width: double.infinity,
                child: CachedNetworkImage(
                  imageUrl: ep.thumbnail,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    color: AppColors.surfaceElevated,
                    child: const Icon(Icons.access_time_filled, color: AppColors.textMuted),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                left: 8,
                child: CountdownTimerWidget(targetDate: releaseDate, compact: true),
              ),
            ],
          ),

          // Title & Series
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ep.title,
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
                  ep.seriesTitle ?? 'Scheduled Episode',
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
    );
  }
}
