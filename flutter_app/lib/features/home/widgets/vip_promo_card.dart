import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';

class VipPromoCard extends StatelessWidget {
  final bool isVip;

  const VipPromoCard({
    super.key,
    required this.isVip,
  });

  @override
  Widget build(BuildContext context) {
    if (isVip) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.vipGold.withOpacity(0.4), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: AppColors.vipGold.withOpacity(0.12),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    gradient: AppColors.goldGradient,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.workspace_premium, size: 20, color: Colors.black),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Unlock Sri Explainer VIP',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        '100% Ad-Free • Early Access • 4K Streams',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.vipGold,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Enjoy uninterrupted anime recaps and exclusive comic breakdowns before anyone else.',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 14),
            PrimaryButton(
              text: 'Become a VIP Member',
              icon: Icons.star_rounded,
              height: 42,
              onPressed: () {
                context.push('/vip');
              },
            ),
          ],
        ),
      ),
    );
  }
}
