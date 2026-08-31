import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';

class MainShellScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const MainShellScreen({
    super.key,
    required this.navigationShell,
  });

  void _onTap(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0D0D0D),
          border: Border(
            top: BorderSide(color: AppColors.surfaceBorder, width: 0.8),
          ),
        ),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: _onTap,
          backgroundColor: Colors.transparent,
          indicatorColor: AppColors.vipGold.withOpacity(0.15),
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined, color: AppColors.textMuted),
              selectedIcon: Icon(Icons.home_rounded, color: AppColors.vipGold),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.explore_outlined, color: AppColors.textMuted),
              selectedIcon: Icon(Icons.explore_rounded, color: AppColors.vipGold),
              label: 'Explore',
            ),
            NavigationDestination(
              icon: Icon(Icons.bookmark_border_rounded, color: AppColors.textMuted),
              selectedIcon: Icon(Icons.bookmark_rounded, color: AppColors.vipGold),
              label: 'My List',
            ),
            NavigationDestination(
              icon: Icon(Icons.history_rounded, color: AppColors.textMuted),
              selectedIcon: Icon(Icons.history_toggle_off_rounded, color: AppColors.vipGold),
              label: 'History',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded, color: AppColors.textMuted),
              selectedIcon: Icon(Icons.person_rounded, color: AppColors.vipGold),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
