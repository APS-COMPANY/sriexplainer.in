import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/error_state_widget.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../core/providers/network_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/home_provider.dart';
import '../widgets/hero_banner_carousel.dart';
import '../widgets/continue_watching_section.dart';
import '../widgets/latest_episodes_section.dart';
import '../widgets/trending_section.dart';
import '../widgets/upcoming_countdown_section.dart';
import '../widgets/vip_promo_card.dart';
import '../widgets/xp_wallet_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeState = ref.watch(homeProvider);
    final authState = ref.watch(authProvider);
    final isOnline = ref.watch(isOnlineProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Dynamic App Bar
          SliverAppBar(
            floating: true,
            pinned: false,
            snap: true,
            backgroundColor: AppColors.background.withOpacity(0.9),
            elevation: 0,
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    gradient: AppColors.goldGradient,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.play_arrow_rounded, size: 16, color: Colors.black),
                ),
                const SizedBox(width: 8),
                RichText(
                  text: const TextSpan(
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: -0.3,
                    ),
                    children: [
                      TextSpan(text: 'SRI '),
                      TextSpan(
                        text: 'EXPLAINER',
                        style: TextStyle(color: AppColors.vipGold),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.search_rounded, color: Colors.white),
                onPressed: () {
                  context.push('/explore');
                },
              ),
              if (authState.isAuthenticated) ...[
                IconButton(
                  icon: const Icon(Icons.workspace_premium, color: AppColors.vipGold),
                  onPressed: () {
                    context.push('/vip');
                  },
                ),
              ] else ...[
                TextButton(
                  onPressed: () {
                    context.push('/login');
                  },
                  child: const Text(
                    'Log In',
                    style: TextStyle(
                      color: AppColors.vipGold,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
              const SizedBox(width: 8),
            ],
          ),

          // Offline Notice
          if (!isOnline)
            const SliverToBoxAdapter(
              child: OfflineBanner(),
            ),

          // Body Content
          if (homeState.isLoading && homeState.featured.isEmpty)
            const SliverFillRemaining(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.vipGold),
              ),
            )
          else if (homeState.error != null && homeState.featured.isEmpty)
            SliverFillRemaining(
              child: ErrorStateWidget(
                message: homeState.error!,
                onRetry: () {
                  ref.read(homeProvider.notifier).loadHomeData(refresh: true);
                },
              ),
            )
          else
            SliverList(
              delegate: SliverChildListDelegate([
                // 1. Hero Banner Carousel
                HeroBannerCarousel(items: homeState.featured),
                const SizedBox(height: 10),

                // 2. Continue Watching Section
                if (homeState.continueWatching.isNotEmpty)
                  ContinueWatchingSection(items: homeState.continueWatching),

                // 3. VIP Promo Banner
                VipPromoCard(isVip: authState.isVip),

                // 4. Latest Episodes Horizontal Reel
                LatestEpisodesSection(episodes: homeState.latestEpisodes),

                // 5. XP Wallet Status
                if (authState.isAuthenticated)
                  XpWalletCard(xpBalance: authState.xpBalance),

                // 6. Trending Series Section
                TrendingSection(series: homeState.trending),

                // 7. Upcoming Scheduled Releases with Real-Time Countdown
                UpcomingCountdownSection(upcoming: homeState.upcomingEpisodes),

                const SizedBox(height: 30),
              ]),
            ),
        ],
      ),
    );
  }
}
