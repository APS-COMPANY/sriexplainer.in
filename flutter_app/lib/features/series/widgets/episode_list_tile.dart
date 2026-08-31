import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../models/episode_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/quality_badge.dart';
import '../../../core/widgets/vip_badge.dart';
import '../../../core/widgets/xp_coin_badge.dart';
import '../../../core/widgets/countdown_timer_widget.dart';

class EpisodeListTile extends StatelessWidget {
  final EpisodeModel episode;
  final bool isVipUser;
  final VoidCallback onTap;
  final VoidCallback onUnlockXp;

  const EpisodeListTile({
    super.key,
    required this.episode,
    required this.isVipUser,
    required this.onTap,
    required this.onUnlockXp,
  });

  @override
  Widget build(BuildContext context) {
    final isLockedForUser = !episode.isFree &&
        !episode.isUnlocked &&
        !(episode.isVipOnly && isVipUser);

    final isScheduled = episode.isScheduledFuture;

    return GestureDetector(
      onTap: () {
        if (isScheduled) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('This episode is scheduled for a future release.')),
          );
          return;
        }

        if (isLockedForUser && episode.isCoinUnlock) {
          onUnlockXp();
        } else {
          onTap();
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: episode.isUnlocked ? AppColors.xpAmber.withOpacity(0.4) : AppColors.surfaceBorder,
            width: 0.8,
          ),
        ),
        child: Row(
          children: [
            // Thumbnail with Badges
            Stack(
              children: [
                Container(
                  width: 110,
                  height: 68,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: AppColors.surfaceElevated,
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: CachedNetworkImage(
                    imageUrl: episode.thumbnail,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => const Center(
                      child: Icon(Icons.play_circle_fill, color: AppColors.textMuted),
                    ),
                  ),
                ),

                // Play / Lock overlay
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: Colors.black.withOpacity(isLockedForUser ? 0.6 : 0.2),
                    ),
                    child: Center(
                      child: Icon(
                        isScheduled
                            ? Icons.schedule_rounded
                            : (isLockedForUser ? Icons.lock_rounded : Icons.play_arrow_rounded),
                        color: isLockedForUser ? AppColors.vipGold : Colors.white,
                        size: 24,
                      ),
                    ),
                  ),
                ),

                // Corner Quality Badge
                Positioned(
                  bottom: 4,
                  right: 4,
                  child: QualityBadge(quality: episode.quality, fontSize: 7),
                ),
              ],
            ),
            const SizedBox(width: 12),

            // Episode Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'EP ${episode.number}',
                        style: const TextStyle(
                          color: AppColors.vipGold,
                          fontWeight: FontWeight.w900,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(width: 6),
                      if (episode.isVipOnly) const VipBadge(size: 10, showText: false),
                      if (episode.isCoinUnlock && !episode.isUnlocked)
                        XpCoinBadge(coins: episode.xpCost, isCost: true, fontSize: 8),
                      if (episode.isUnlocked)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.freeBadge.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: AppColors.freeBadge, width: 0.8),
                          ),
                          child: const Text(
                            'UNLOCKED',
                            style: TextStyle(color: AppColors.freeBadge, fontSize: 8, fontWeight: FontWeight.w900),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    episode.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),

                  if (isScheduled && episode.releaseDateTime != null)
                    CountdownTimerWidget(targetDate: episode.releaseDateTime!, compact: true)
                  else
                    Text(
                      episode.description.isNotEmpty ? episode.description : '${episode.views} views',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                ],
              ),
            ),

            // Trailing Action
            if (isLockedForUser && episode.isCoinUnlock)
              IconButton(
                icon: const Icon(Icons.key_rounded, color: AppColors.xpAmber, size: 20),
                onPressed: onUnlockXp,
              )
            else if (!isScheduled)
              const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 22),
          ],
        ),
      ),
    );
  }
}
