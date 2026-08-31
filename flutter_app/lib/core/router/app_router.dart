import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/splash/screens/splash_screen.dart';
import '../../features/main/screens/main_shell_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/explore/screens/explore_screen.dart';
import '../../features/my_list/screens/my_list_screen.dart';
import '../../features/history/screens/history_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/series/screens/series_detail_screen.dart';
import '../../features/player/screens/watch_screen.dart';
import '../../features/vip/screens/vip_screen.dart';
import '../../features/xp_coins/screens/xp_wallet_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final _homeNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'home');
final _exploreNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'explore');
final _myListNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'myList');
final _historyNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'history');
final _profileNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'profile');

final appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/splash',
  routes: [
    // Splash Route
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashScreen(),
    ),

    // Auth Routes
    GoRoute(
      path: '/login',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const RegisterScreen(),
    ),

    // VIP & XP Wallet Full-Screen Routes
    GoRoute(
      path: '/vip',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const VipScreen(),
    ),
    GoRoute(
      path: '/pricing',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const VipScreen(),
    ),
    GoRoute(
      path: '/xp-wallet',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const XpWalletScreen(),
    ),

    // Deep Linked Details & Watch Screens
    GoRoute(
      path: '/series/:slug',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final slug = state.pathParameters['slug'] ?? '';
        return SeriesDetailScreen(slug: slug);
      },
    ),
    GoRoute(
      path: '/watch/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final episodeId = state.pathParameters['id'] ?? '';
        final seriesId = state.uri.queryParameters['seriesId'];
        return WatchScreen(episodeId: episodeId, seriesId: seriesId);
      },
    ),

    // Stateful Bottom Navigation Shell
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return MainShellScreen(navigationShell: navigationShell);
      },
      branches: [
        // Tab 1: Home
        StatefulShellBranch(
          navigatorKey: _homeNavigatorKey,
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => const HomeScreen(),
            ),
          ],
        ),

        // Tab 2: Explore
        StatefulShellBranch(
          navigatorKey: _exploreNavigatorKey,
          routes: [
            GoRoute(
              path: '/explore',
              builder: (context, state) => const ExploreScreen(),
            ),
          ],
        ),

        // Tab 3: My List
        StatefulShellBranch(
          navigatorKey: _myListNavigatorKey,
          routes: [
            GoRoute(
              path: '/my-list',
              builder: (context, state) => const MyListScreen(),
            ),
          ],
        ),

        // Tab 4: History
        StatefulShellBranch(
          navigatorKey: _historyNavigatorKey,
          routes: [
            GoRoute(
              path: '/history',
              builder: (context, state) => const HistoryScreen(),
            ),
          ],
        ),

        // Tab 5: Profile
        StatefulShellBranch(
          navigatorKey: _profileNavigatorKey,
          routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
      ],
    ),
  ],
);
