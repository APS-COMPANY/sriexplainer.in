import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/quality_badge.dart';
import '../../../core/widgets/vip_badge.dart';
import '../../../core/widgets/xp_coin_badge.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/error_state_widget.dart';
import '../../../models/episode_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../home/providers/home_provider.dart';
import '../widgets/rumble_player_view.dart';
import '../widgets/auto_next_prompt.dart';
import '../../comments/widgets/comments_section_widget.dart';
import '../../episode/widgets/xp_unlock_bottom_sheet.dart';

final episodeDetailFutureProvider = FutureProvider.family<EpisodeModel, String>((ref, id) async {
  final repo = ref.watch(episodeRepositoryProvider);
  return await repo.getEpisodeDetail(id);
});

class WatchScreen extends ConsumerStatefulWidget {
  final String episodeId;
  final String? seriesId;

  const WatchScreen({
    super.key,
    required this.episodeId,
    this.seriesId,
  });

  @override
  ConsumerState<WatchScreen> createState() => _WatchScreenState();
}

class _WatchScreenState extends ConsumerState<WatchScreen> {
  bool _isLiked = false;
  int _hypeCount = 0;
  bool _showAutoNext = false;
  EpisodeModel? _nextEpisode;

  @override
  void initState() {
    super.initState();
    // Record view in background
    Future.microtask(() {
      ref.read(episodeRepositoryProvider).recordView(widget.episodeId);
    });
  }

  void _handleHype(EpisodeModel ep) {
    setState(() {
      _hypeCount++;
    });
    ref.read(episodeRepositoryProvider).sendHype(ep.id);
  }

  void _handleLike(EpisodeModel ep) {
    setState(() {
      _isLiked = !_isLiked;
    });
    ref.read(episodeRepositoryProvider).likeEpisode(ep.id);
  }

  @override
  Widget build(BuildContext context) {
    final epAsync = ref.watch(episodeDetailFutureProvider(widget.episodeId));
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: epAsync.when(
          data: (ep) => Text(
            ep.seriesTitle ?? 'Watching Episode',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          loading: () => const Text('Loading...', style: TextStyle(fontSize: 14)),
          error: (_, __) => const Text('Watch', style: TextStyle(fontSize: 14)),
        ),
      ),
      body: epAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.vipGold)),
        error: (err, _) => ErrorStateWidget(
          message: err.toString(),
          onRetry: () => ref.invalidate(episodeDetailFutureProvider(widget.episodeId)),
        ),
        data: (ep) {
          final isVipUser = authState.isVip;
          final isLocked = !ep.isFree && !ep.isUnlocked && !(ep.isVipOnly && isVipUser);

          // Save progress in watch history
          Future.microtask(() {
            ref.read(historyRepositoryProvider).syncWatchProgress(
              episodeId: ep.id,
              seriesId: ep.seriesId,
              seriesTitle: ep.seriesTitle ?? 'Series',
              episodeTitle: ep.title,
              thumbnail: ep.thumbnail,
              progressSeconds: 30,
              durationSeconds: 600,
            );
          });

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Video Player Area
                if (isLocked)
                  _buildLockedPlayerPlaceholder(context, ep)
                else
                  RumblePlayerView(
                    embedUrl: ep.embedUrl,
                    onVideoEnded: () {
                      if (_nextEpisode != null) {
                        setState(() {
                          _showAutoNext = true;
                        });
                      }
                    },
                  ),

                // Auto Next Episode Overlay Prompt
                if (_showAutoNext && _nextEpisode != null)
                  AutoNextPrompt(
                    nextEpisode: _nextEpisode!,
                    onPlayNext: () {
                      context.pushReplacement('/watch/${_nextEpisode!.id}?seriesId=${_nextEpisode!.seriesId}');
                    },
                    onCancel: () {
                      setState(() {
                        _showAutoNext = false;
                      });
                    },
                  ),

                // Episode Metadata and Controls
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badges
                      Row(
                        children: [
                          QualityBadge(quality: ep.quality, fontSize: 10),
                          const SizedBox(width: 6),
                          if (ep.isVipOnly) const VipBadge(size: 11),
                          if (ep.isCoinUnlock) XpCoinBadge(coins: ep.xpCost, isCost: true, fontSize: 10),
                          const Spacer(),
                          Text(
                            '${ep.views} views',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Title
                      Text(
                        ep.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 4),

                      // Description
                      if (ep.description.isNotEmpty)
                        Text(
                          ep.description,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.4,
                          ),
                        ),
                      const SizedBox(height: 16),

                      // Interactive Actions (Hype, Like, Share)
                      Row(
                        children: [
                          // Hype Fire Button
                          InkWell(
                            onTap: () => _handleHype(ep),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.redAccent.withOpacity(0.4)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.local_fire_department_rounded, color: AppColors.redAccent, size: 18),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Hype (${ep.hypeCount + _hypeCount})',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Like Button
                          InkWell(
                            onTap: () => _handleLike(ep),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.surfaceBorder),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    _isLiked ? Icons.thumb_up_rounded : Icons.thumb_up_outlined,
                                    color: _isLiked ? AppColors.vipGold : Colors.white,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    _isLiked ? 'Liked' : 'Like',
                                    style: TextStyle(
                                      color: _isLiked ? AppColors.vipGold : Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const Divider(color: AppColors.surfaceBorder, height: 24),

                // Episode Comments Section
                CommentsSectionWidget(episodeId: ep.id),

                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildLockedPlayerPlaceholder(BuildContext context, EpisodeModel ep) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        color: AppColors.surfaceElevated,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.xpBadgeBg,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.xpAmber),
              ),
              child: const Icon(Icons.lock_rounded, color: AppColors.xpAmber, size: 32),
            ),
            const SizedBox(height: 12),
            Text(
              ep.isVipOnly ? 'VIP Exclusive Episode' : 'Locked Episode (${ep.xpCost} XP)',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              ep.isVipOnly
                  ? 'Join Sri Explainer VIP for ad-free early access.'
                  : 'Unlock this episode permanently using your XP Coin balance.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            if (ep.isVipOnly)
              PrimaryButton(
                text: 'Get VIP Membership',
                icon: Icons.workspace_premium,
                height: 38,
                onPressed: () {
                  context.push('/vip');
                },
              )
            else
              PrimaryButton(
                text: 'Unlock for ${ep.xpCost} XP Coins',
                icon: Icons.key_rounded,
                height: 38,
                onPressed: () {
                  XpUnlockBottomSheet.show(
                    context,
                    episode: ep,
                    onUnlocked: () {
                      ref.invalidate(episodeDetailFutureProvider(widget.episodeId));
                    },
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
