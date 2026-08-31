import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../../models/series_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/quality_badge.dart';
import '../../../core/widgets/primary_button.dart';

class HeroBannerCarousel extends StatefulWidget {
  final List<SeriesModel> items;

  const HeroBannerCarousel({
    super.key,
    required this.items,
  });

  @override
  State<HeroBannerCarousel> createState() => _HeroBannerCarouselState();
}

class _HeroBannerCarouselState extends State<HeroBannerCarousel> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        CarouselSlider.builder(
          itemCount: widget.items.length,
          options: CarouselOptions(
            height: 380,
            viewportFraction: 1.0,
            autoPlay: widget.items.length > 1,
            autoPlayInterval: const Duration(seconds: 6),
            autoPlayAnimationDuration: const Duration(milliseconds: 800),
            autoPlayCurve: Curves.fastOutSlowIn,
            onPageChanged: (index, reason) {
              setState(() {
                _currentIndex = index;
              });
            },
          ),
          itemBuilder: (context, index, realIndex) {
            final series = widget.items[index];
            final imageSrc = series.banner.isNotEmpty ? series.banner : series.thumbnail;

            return Stack(
              fit: StackFit.expand,
              children: [
                // Background Poster
                CachedNetworkImage(
                  imageUrl: imageSrc,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    color: AppColors.surfaceElevated,
                    child: const Center(
                      child: Icon(Icons.movie_outlined, size: 64, color: AppColors.textMuted),
                    ),
                  ),
                ),

                // Cinematic Gradient Overlay
                Container(
                  decoration: const BoxDecoration(
                    gradient: AppColors.heroGradient,
                  ),
                ),

                // Top Shadow
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 100,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.black.withOpacity(0.7), Colors.transparent],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ),

                // Content Overlay
                Positioned(
                  bottom: 24,
                  left: 16,
                  right: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Badges
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
                                color: AppColors.textSecondary,
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${series.year}',
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Title
                      Text(
                        series.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.3,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Description
                      if (series.description.isNotEmpty)
                        Text(
                          series.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.75),
                            height: 1.3,
                          ),
                        ),
                      const SizedBox(height: 14),

                      // Action Buttons
                      Row(
                        children: [
                          PrimaryButton(
                            text: 'Watch Now',
                            icon: Icons.play_arrow_rounded,
                            height: 40,
                            onPressed: () {
                              context.push('/series/${series.slug}');
                            },
                          ),
                          const SizedBox(width: 10),
                          OutlinedButton.icon(
                            onPressed: () {
                              context.push('/series/${series.slug}');
                            },
                            icon: const Icon(Icons.info_outline_rounded, size: 16, color: Colors.white),
                            label: const Text(
                              'Details',
                              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.surfaceBorder),
                              backgroundColor: AppColors.surface.withOpacity(0.6),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),

        // Carousel Indicators
        if (widget.items.length > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: widget.items.asMap().entries.map((entry) {
              final isSelected = _currentIndex == entry.key;
              return Container(
                width: isSelected ? 18.0 : 6.0,
                height: 4.0,
                margin: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 3.0),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  color: isSelected ? AppColors.vipGold : AppColors.surfaceBorder,
                ),
              );
            }).toList(),
          ),
      ],
    );
  }
}
