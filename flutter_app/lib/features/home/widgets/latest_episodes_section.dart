import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../../models/episode_model.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/quality_badge.dart';
import '../../../core/widgets/vip_badge.dart';
import '../../../core/widgets/xp_coin_badge.dart';

class LatestEpisodesSection extends StatelessWidget {
  final List<EpisodeModel> episodes;

  const LatestEpisodesSection({
    super.key,
    required this.episodes,
  });

  @override
  Widget build(BuildContext context) {
    if (episodes.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Icon(Icons.bolt_rounded, size: 19, color: AppColors.vipGold),
              SizedBox(width: 6),
              Text(
                'Latest Episodes',
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
          height: 165,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: episodes.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final ep = episodes[index];
              return _buildEpisodeCard(context, ep);
            },
          ),
        ),
        const SizedBox(height: 18),
      ],
    );
  }

  Widget _buildEpisodeCard(BuildContext context, EpisodeModel ep) {
    return GestureDetector(
      onTap: () {
        context.push('/watch/${ep.id}?seriesId=${ep.seriesId}');
      },
      child: Container(
        width: 170,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.surfaceBorder, width: 0.8),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            Stack(
              children: [
                SizedBox(
                  height: 100,
                  width: double.infinity,
                  child: ep.thumbnail.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: AppConfig.resolveImageUrl(ep.thumbnail),
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => Container(
                            color: AppColors.surfaceElevated,
                            child: const Center(
                              child: Icon(Icons.play_circle_outline, color: AppColors.textMuted),
                            ),
                          ),
                        )
                      : Container(
                          color: AppColors.surfaceElevated,
                          child: const Center(
                            child: Icon(Icons.play_circle_outline, color: AppColors.textMuted),
                          ),
                        ),
                ),

                // Access Badges
                Positioned(
                  top: 6,
                  left: 6,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (ep.isVipOnly) const VipBadge(size: 11, showText: false),
                      if (ep.isCoinUnlock) XpCoinBadge(coins: ep.xpCost, isCost: true, fontSize: 9),
                      if (ep.isFree)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.freeBadge,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'FREE',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 8,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Quality Badge
                Positioned(
                  bottom: 6,
                  right: 6,
                  child: QualityBadge(quality: ep.quality, fontSize: 8),
                ),
              ],
            ),

            // Episode Info
            Padding(
              padding: const EdgeInsets.all(6.0),
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
                    ep.seriesTitle ?? 'Episode ${ep.number}',
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
