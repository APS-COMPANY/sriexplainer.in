import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../models/episode_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/xp_coin_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../../home/providers/home_provider.dart';

class XpUnlockBottomSheet extends ConsumerStatefulWidget {
  final EpisodeModel episode;
  final VoidCallback onUnlocked;

  const XpUnlockBottomSheet({
    super.key,
    required this.episode,
    required this.onUnlocked,
  });

  static Future<void> show(
    BuildContext context, {
    required EpisodeModel episode,
    required VoidCallback onUnlocked,
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => XpUnlockBottomSheet(
        episode: episode,
        onUnlocked: onUnlocked,
      ),
    );
  }

  @override
  ConsumerState<XpUnlockBottomSheet> createState() => _XpUnlockBottomSheetState();
}

class _XpUnlockBottomSheetState extends ConsumerState<XpUnlockBottomSheet> {
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleUnlock() async {
    final authState = ref.read(authProvider);

    if (!authState.isAuthenticated) {
      Navigator.pop(context);
      context.push('/login');
      return;
    }

    if (authState.xpBalance < widget.episode.xpCost) {
      setState(() {
        _errorMessage = 'Insufficient XP Coins. Top up your wallet to continue.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(episodeRepositoryProvider);
      final res = await repo.unlockEpisodeWithXp(widget.episode.id);

      final newXp = int.tryParse(res['xpBalance']?.toString() ?? '') ?? (authState.xpBalance - widget.episode.xpCost);
      ref.read(authProvider.notifier).updateUserXp(newXp);

      if (mounted) {
        Navigator.pop(context);
        widget.onUnlocked();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.surfaceElevated,
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: AppColors.freeBadge),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Episode unlocked permanently for ${widget.episode.xpCost} XP Coins!',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final currentBalance = authState.xpBalance;
    final cost = widget.episode.xpCost;
    final remainingBalance = currentBalance - cost;
    final hasEnough = currentBalance >= cost;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: AppColors.surfaceBorder, width: 1.5),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.surfaceBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.xpBadgeBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.xpAmber.withOpacity(0.5)),
                ),
                child: const Icon(Icons.lock_open_rounded, color: AppColors.xpAmber, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Unlock Episode',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      widget.episode.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Balance & Cost Summary Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: Column(
              children: [
                _buildRow('Current XP Balance', '$currentBalance XP', AppColors.textPrimary),
                const Divider(color: AppColors.surfaceBorder, height: 16),
                _buildRow('Unlock Cost', '- $cost XP', AppColors.redAccent),
                const Divider(color: AppColors.surfaceBorder, height: 16),
                _buildRow(
                  'Remaining Balance',
                  hasEnough ? '$remainingBalance XP' : 'Insufficient Coins',
                  hasEnough ? AppColors.freeBadge : AppColors.redAccent,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.redAccent.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: AppColors.redAccent, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Action CTA
          if (!hasEnough) ...[
            PrimaryButton(
              text: 'Top Up XP Coins',
              icon: Icons.add_circle_outline_rounded,
              isGold: true,
              onPressed: () {
                Navigator.pop(context);
                context.push('/xp-wallet');
              },
            ),
          ] else ...[
            PrimaryButton(
              text: 'Confirm Unlock ($cost XP)',
              icon: Icons.key_rounded,
              isLoading: _isLoading,
              isGold: true,
              onPressed: _handleUnlock,
            ),
          ],
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        Text(
          value,
          style: TextStyle(
            color: valueColor,
            fontWeight: FontWeight.w800,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}
