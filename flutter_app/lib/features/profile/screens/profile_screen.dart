import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/vip_badge.dart';
import '../../../core/widgets/xp_coin_badge.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/config/app_config.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // User Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: authState.isVip ? AppColors.vipGold.withOpacity(0.4) : AppColors.surfaceBorder,
                  width: 1.2,
                ),
              ),
              child: authState.isAuthenticated
                  ? Row(
                      children: [
                        CircleAvatar(
                          radius: 30,
                          backgroundColor: AppColors.surfaceElevated,
                          child: Text(
                            user?.username.isNotEmpty == true ? user!.username[0].toUpperCase() : 'U',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: AppColors.vipGold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    user?.username ?? 'Viewer',
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  if (authState.isVip) const VipBadge(size: 11),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                user?.email ?? '',
                                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                              ),
                              const SizedBox(height: 8),
                              XpCoinBadge(coins: authState.xpBalance, fontSize: 11),
                            ],
                          ),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        const Icon(Icons.account_circle_outlined, size: 54, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        const Text(
                          'Sign in to Sri Explainer',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Sync your watch history, XP Coins, and VIP subscriptions.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 16),
                        PrimaryButton(
                          text: 'Log In or Register',
                          icon: Icons.login_rounded,
                          height: 42,
                          onPressed: () => context.push('/login'),
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 20),

            // Navigation Options
            _buildSection(
              title: 'Streaming & Features',
              items: [
                _buildTile(
                  icon: Icons.workspace_premium_rounded,
                  iconColor: AppColors.vipGold,
                  title: 'VIP Membership',
                  subtitle: authState.isVip ? 'Active Member' : 'Upgrade to Ad-Free 4K',
                  onTap: () => context.push('/vip'),
                ),
                _buildTile(
                  icon: Icons.monetization_on_rounded,
                  iconColor: AppColors.xpAmber,
                  title: 'XP Coins Wallet',
                  subtitle: '${authState.xpBalance} Coins Available',
                  onTap: () => context.push('/xp-wallet'),
                ),
                _buildTile(
                  icon: Icons.bookmark_rounded,
                  iconColor: Colors.white,
                  title: 'My Saved List',
                  onTap: () => context.go('/my-list'),
                ),
                _buildTile(
                  icon: Icons.history_rounded,
                  iconColor: Colors.white,
                  title: 'Watch History',
                  onTap: () => context.go('/history'),
                ),
              ],
            ),
            const SizedBox(height: 16),

            _buildSection(
              title: 'General & Support',
              items: [
                _buildTile(
                  icon: Icons.public_rounded,
                  iconColor: Colors.white,
                  title: 'Visit Official Website',
                  subtitle: 'https://sriexplainer.in',
                  onTap: () => launchUrl(Uri.parse(AppConfig.siteUrl), mode: LaunchMode.externalApplication),
                ),
                _buildTile(
                  icon: Icons.info_outline_rounded,
                  iconColor: Colors.white,
                  title: 'About Sri Explainer',
                  subtitle: 'v${AppConfig.appVersion} (${AppConfig.buildNumber})',
                  onTap: () {
                    showAboutDialog(
                      context: context,
                      applicationName: AppConfig.appName,
                      applicationVersion: AppConfig.appVersion,
                      applicationLegalese: '© 2026 Sri Explainer. All Rights Reserved.',
                    );
                  },
                ),
              ],
            ),

            if (authState.isAuthenticated) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    ref.read(authProvider.notifier).logout();
                  },
                  icon: const Icon(Icons.logout_rounded, color: AppColors.redAccent, size: 18),
                  label: const Text(
                    'Log Out',
                    style: TextStyle(color: AppColors.redAccent, fontWeight: FontWeight.w700),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: AppColors.redAccent.withOpacity(0.4)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required List<Widget> items}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textMuted),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.surfaceBorder),
          ),
          child: Column(children: items),
        ),
      ],
    );
  }

  Widget _buildTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18, color: iconColor),
      ),
      title: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
      subtitle: subtitle != null ? Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)) : null,
      trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
    );
  }
}
