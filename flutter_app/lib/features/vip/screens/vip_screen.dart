import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../models/subscription_plan_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/vip_provider.dart';

class VipScreen extends ConsumerStatefulWidget {
  const VipScreen({super.key});

  @override
  ConsumerState<VipScreen> createState() => _VipScreenState();
}

class _VipScreenState extends ConsumerState<VipScreen> {
  String _selectedPlanId = 'vip_quarterly';

  Future<void> _handleSubscribe(SubscriptionPlanModel plan) async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) {
      context.push('/login');
      return;
    }

    final res = await ref.read(vipProvider.notifier).initiatePayment(
      planId: plan.id,
      amount: plan.price,
    );

    if (res != null && mounted) {
      final orderId = res['order_id'] ?? res['orderId'] ?? res['id'];
      _showPaymentSimulationDialog(
        context,
        orderId: orderId?.toString() ?? 'order_${DateTime.now().millisecondsSinceEpoch}',
        plan: plan,
      );
    }
  }

  void _showPaymentSimulationDialog(BuildContext context, {required String orderId, required SubscriptionPlanModel plan}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.payment_rounded, color: AppColors.vipGold),
            SizedBox(width: 8),
            Text('Cashfree Gateway', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order ID: $orderId', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
            const SizedBox(height: 8),
            Text('Plan: ${plan.title} (₹${plan.price.toInt()})', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            const Text(
              'Complete your payment using UPI, GPay, PhonePe, or Card.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          PrimaryButton(
            text: 'Verify & Activate VIP',
            isGold: true,
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref.read(vipProvider.notifier).verifyPayment(orderId);
              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    backgroundColor: AppColors.surfaceElevated,
                    content: Text('🎉 Congratulations! VIP Membership is now active on your account.'),
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isVip = authState.isVip;
    final vipState = ref.watch(vipProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('VIP Membership'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: isVip ? AppColors.goldGradient : null,
                color: !isVip ? AppColors.surfaceElevated : null,
                borderRadius: BorderRadius.circular(20),
                border: !isVip ? Border.all(color: AppColors.vipGold.withOpacity(0.3)) : null,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isVip ? Colors.black : AppColors.surfaceBorder,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.workspace_premium,
                      size: 28,
                      color: isVip ? AppColors.vipGold : Colors.white,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isVip ? 'ACTIVE VIP MEMBER' : 'FREE VIEWER',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: isVip ? Colors.black : Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isVip && authState.user?.subscriptionEndsAt != null
                              ? 'Valid until ${DateFormat.yMMMd().format(DateTime.parse(authState.user!.subscriptionEndsAt!))}'
                              : 'Upgrade to watch 100% ad-free in 4K',
                          style: TextStyle(
                            fontSize: 12,
                            color: isVip ? Colors.black87 : AppColors.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Benefits Checklist
            const Text(
              'VIP Privileges',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 12),
            _buildPrivilege(Icons.block_rounded, '100% Ad-Free Video Streaming'),
            _buildPrivilege(Icons.flash_on_rounded, 'Early Access to New Episodes & Series'),
            _buildPrivilege(Icons.high_quality_rounded, 'Stream in Crystal Clear Ultra HD / 4K'),
            _buildPrivilege(Icons.stars_rounded, 'Exclusive Golden Crown Profile & Comment Badge'),
            _buildPrivilege(Icons.monetization_on_rounded, 'Bonus Free XP Coins for Unlocking Comics'),
            const SizedBox(height: 24),

            // Subscription Plans
            const Text(
              'Select a Membership Plan',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 12),

            ...SubscriptionPlanModel.defaultPlans.map((plan) {
              final isSelected = _selectedPlanId == plan.id;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedPlanId = plan.id;
                  });
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected ? AppColors.vipGold : AppColors.surfaceBorder,
                      width: isSelected ? 1.5 : 1.0,
                    ),
                  ),
                  child: Row(
                    children: [
                      Radio<String>(
                        value: plan.id,
                        groupValue: _selectedPlanId,
                        activeColor: AppColors.vipGold,
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedPlanId = val);
                        },
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  plan.title,
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white),
                                ),
                                if (plan.badge.isNotEmpty) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.vipGold,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      plan.badge,
                                      style: const TextStyle(color: Colors.black, fontSize: 8, fontWeight: FontWeight.w900),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(plan.durationText, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '₹${plan.price.toInt()}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: AppColors.vipGold,
                            ),
                          ),
                          if (plan.originalPrice != null)
                            Text(
                              '₹${plan.originalPrice!.toInt()}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),

            const SizedBox(height: 16),

            if (vipState.error != null) ...[
              Text(
                vipState.error!,
                style: const TextStyle(color: AppColors.redAccent, fontSize: 12),
              ),
              const SizedBox(height: 12),
            ],

            // Purchase Button
            PrimaryButton(
              text: 'Subscribe Now via Cashfree',
              icon: Icons.shield_rounded,
              isLoading: vipState.isLoading,
              onPressed: () {
                final plan = SubscriptionPlanModel.defaultPlans.firstWhere((p) => p.id == _selectedPlanId);
                _handleSubscribe(plan);
              },
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildPrivilege(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.vipGold),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
