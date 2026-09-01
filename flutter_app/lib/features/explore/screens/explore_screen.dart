import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/quality_badge.dart';
import '../../../core/widgets/empty_state_widget.dart';
import '../../../core/widgets/error_state_widget.dart';
import '../../../models/series_model.dart';
import '../providers/explore_provider.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  static const List<String> genres = [
    'All',
    'Anime',
    'Manhwa',
    'Cultivation',
    'Action',
    'Fantasy',
    'Romance',
    'Sci-Fi',
    'Reincarnation',
    'Mystery',
    'System',
    'Supernatural',
  ];

  static const List<String> statuses = [
    'All',
    'Ongoing',
    'Completed',
    'Upcoming',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      ref.read(exploreProvider.notifier).setSearchQuery(query);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(exploreProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Explore Catalog'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search anime, comics, cultivation...',
                prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18, color: AppColors.textMuted),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(exploreProvider.notifier).setSearchQuery('');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              ),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Genre Chips Filter
          SizedBox(
            height: 38,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: genres.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final genre = genres[index];
                final isSelected = state.selectedGenre == genre;
                return ChoiceChip(
                  label: Text(genre),
                  selected: isSelected,
                  onSelected: (_) {
                    ref.read(exploreProvider.notifier).setGenre(genre);
                  },
                  selectedColor: AppColors.vipGold,
                  backgroundColor: AppColors.surfaceElevated,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.black : AppColors.textSecondary,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    fontSize: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(
                      color: isSelected ? AppColors.vipGold : AppColors.surfaceBorder,
                      width: 0.8,
                    ),
                  ),
                  showCheckmark: false,
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Status and Sorting Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Status Pills (Scrollable)
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: statuses.map((status) {
                        final isSelected = state.selectedStatus == status;
                        return GestureDetector(
                          onTap: () {
                            ref.read(exploreProvider.notifier).setStatus(status);
                          },
                          child: Container(
                            margin: const EdgeInsets.only(right: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.surfaceElevated : Colors.transparent,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: isSelected ? AppColors.vipGold : Colors.transparent,
                                width: 0.8,
                              ),
                            ),
                            child: Text(
                              status,
                              style: TextStyle(
                                color: isSelected ? AppColors.vipGold : AppColors.textMuted,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Sort Dropdown
                DropdownButton<String>(
                  value: state.sortBy,
                  dropdownColor: AppColors.surfaceElevated,
                  underline: const SizedBox.shrink(),
                  icon: const Icon(Icons.sort_rounded, color: AppColors.vipGold, size: 18),
                  items: const [
                    DropdownMenuItem(value: 'latest', child: Text('Latest', style: TextStyle(fontSize: 12))),
                    DropdownMenuItem(value: 'popular', child: Text('Popular', style: TextStyle(fontSize: 12))),
                    DropdownMenuItem(value: 'views', child: Text('Most Viewed', style: TextStyle(fontSize: 12))),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      ref.read(exploreProvider.notifier).setSortBy(val);
                    }
                  },
                ),
              ],
            ),
          ),
          const Divider(color: AppColors.surfaceBorder, height: 16),

          // Series Grid Content
          Expanded(
            child: _buildGrid(context, state),
          ),
        ],
      ),
    );
  }

  Widget _buildGrid(BuildContext context, ExploreState state) {
    if (state.isLoading && state.seriesList.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: AppColors.vipGold));
    }

    if (state.error != null && state.seriesList.isEmpty) {
      return ErrorStateWidget(
        message: state.error!,
        onRetry: () => ref.read(exploreProvider.notifier).searchSeries(),
      );
    }

    if (state.seriesList.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.search_off_rounded,
        title: 'No Series Found',
        message: 'Try adjusting your search terms or filters to find what you are looking for.',
        buttonText: 'Reset Filters',
        onAction: () {
          _searchController.clear();
          ref.read(exploreProvider.notifier).setGenre('All');
          ref.read(exploreProvider.notifier).setStatus('All');
          ref.read(exploreProvider.notifier).setSearchQuery('');
        },
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 600 ? 4 : (constraints.maxWidth > 400 ? 3 : 2);

        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: 0.62,
            crossAxisSpacing: 12,
            mainAxisSpacing: 14,
          ),
          itemCount: state.seriesList.length,
          itemBuilder: (context, index) {
            final series = state.seriesList[index];
            return _buildSeriesPosterCard(context, series);
          },
        );
      },
    );
  }

  Widget _buildSeriesPosterCard(BuildContext context, SeriesModel series) {
    return GestureDetector(
      onTap: () {
        context.push('/series/${series.slug}');
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.surfaceBorder, width: 0.8),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: series.thumbnail,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(
                      color: AppColors.surfaceElevated,
                      child: const Center(
                        child: Icon(Icons.movie_outlined, color: AppColors.textMuted),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: QualityBadge(quality: series.latestEpisodeQuality, fontSize: 8),
                  ),
                  Positioned(
                    bottom: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.75),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${series.episodeCount} EP',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    series.title,
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
                    '${series.genre} • ${series.status}',
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
