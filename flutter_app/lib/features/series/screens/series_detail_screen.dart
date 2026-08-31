import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/quality_badge.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/error_state_widget.dart';
import '../../../models/episode_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../my_list/providers/my_list_provider.dart';
import '../providers/series_detail_provider.dart';
import '../widgets/episode_list_tile.dart';
import '../../episode/widgets/xp_unlock_bottom_sheet.dart';

class SeriesDetailScreen extends ConsumerStatefulWidget {
  final String slug;

  const SeriesDetailScreen({
    super.key,
    required this.slug,
  });

  @override
  ConsumerState<SeriesDetailScreen> createState() => _SeriesDetailScreenState();
}

class _SeriesDetailScreenState extends ConsumerState<SeriesDetailScreen> {
  bool _isAscending = true;

  @override
  Widget build(BuildContext context) {
    final seriesAsync = ref.watch(seriesDetailProvider(widget.slug));
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: seriesAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.vipGold),
        ),
        error: (err, _) => ErrorStateWidget(
          message: err.toString(),
          onRetry: () => ref.invalidate(seriesDetailProvider(widget.slug)),
        ),
        data: (series) {
          final myList = ref.watch(myListProvider);
          final isSaved = myList.any((s) => s.id == series.id);

          List<EpisodeModel> episodes = List.from(series.episodes ?? []);
          if (!_isAscending) {
            episodes = episodes.reversed.toList();
          }

          return CustomScrollView(
            slivers: [
              // Backdrop Header Sliver
              SliverAppBar(
                expandedHeight: 280,
                pinned: true,
                backgroundColor: AppColors.background,
                leading: IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 20),
                  ),
                  onPressed: () => context.pop(),
                ),
                actions: [
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.share_rounded, color: Colors.white, size: 18),
                    ),
                    onPressed: () {
                      Share.share(
                        'Watch "${series.title}" on Sri Explainer:\nhttps://sriexplainer.in/series/${series.slug}',
                      );
                    },
                  ),
                  const SizedBox(width: 8),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: series.banner.isNotEmpty ? series.banner : series.thumbnail,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => Container(color: AppColors.surfaceElevated),
                      ),
                      Container(
                        decoration: const BoxDecoration(
                          gradient: AppColors.cardOverlayGradient,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Metadata & Action Buttons
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badges Row
                      Row(
                        children: [
                          QualityBadge(quality: series.latestEpisodeQuality, fontSize: 10),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: AppColors.surfaceBorder),
                            ),
                            child: Text(
                              series.genre.toUpperCase(),
                              style: const TextStyle(
                                color: AppColors.vipGold,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${series.year} • ${series.status}',
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Title
                      Text(
                        series.title,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Play First / Resume & My List CTA
                      Row(
                        children: [
                          if (episodes.isNotEmpty)
                            Expanded(
                              child: PrimaryButton(
                                text: 'Play Episode 1',
                                icon: Icons.play_arrow_rounded,
                                onPressed: () {
                                  context.push('/watch/${episodes.first.id}?seriesId=${series.id}');
                                },
                              ),
                            ),
                          const SizedBox(width: 10),
                          IconButton(
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.surfaceElevated,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: const BorderSide(color: AppColors.surfaceBorder),
                              ),
                              padding: const EdgeInsets.all(12),
                            ),
                            icon: Icon(
                              isSaved ? Icons.bookmark_added_rounded : Icons.bookmark_add_outlined,
                              color: isSaved ? AppColors.vipGold : Colors.white,
                            ),
                            onPressed: () {
                              ref.read(myListProvider.notifier).toggleSeries(series);
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Description
                      if (series.description.isNotEmpty) ...[
                        const Text(
                          'Synopsis',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          series.description,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.45,
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // Episodes Section Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Episodes (${episodes.length})',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () {
                              setState(() {
                                _isAscending = !_isAscending;
                              });
                            },
                            icon: Icon(
                              _isAscending ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                              size: 14,
                              color: AppColors.vipGold,
                            ),
                            label: Text(
                              _isAscending ? 'Ep 1 First' : 'Latest First',
                              style: const TextStyle(
                                color: AppColors.vipGold,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),

              // Episodes List Sliver
              if (episodes.isEmpty)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(
                      child: Text(
                        'No episodes published yet for this series.',
                        style: TextStyle(color: AppColors.textMuted),
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final ep = episodes[index];
                        return EpisodeListTile(
                          episode: ep,
                          isVipUser: authState.isVip,
                          onTap: () {
                            context.push('/watch/${ep.id}?seriesId=${series.id}');
                          },
                          onUnlockXp: () {
                            XpUnlockBottomSheet.show(
                              context,
                              episode: ep,
                              onUnlocked: () {
                                ref.invalidate(seriesDetailProvider(widget.slug));
                              },
                            );
                          },
                        );
                      },
                      childCount: episodes.length,
                    ),
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 40)),
            ],
          );
        },
      ),
    );
  }
}
