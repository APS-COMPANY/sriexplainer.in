import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/xp_coin_badge.dart';
import '../../../models/xp_transaction_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/xp_provider.dart';

class XpWalletScreen extends ConsumerWidget {
  const XpWalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final transactionsAsync = ref.watch(xpTransactionsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('XP Coin Wallet'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.xpAmber.withOpacity(0.4), width: 1.2),
              ),
              child: Column(
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.monetization_on, color: AppColors.xpAmber, size: 28),
                      SizedBox(width: 8),
                      Text(
                        'Total XP Balance',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${authState.xpBalance}',
                    style: const TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.w900,
                      color: AppColors.xpAmber,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Use XP Coins to unlock individual premium episodes permanently.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Top-Up Packages
            const Text(
              'Top-Up Packages',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildCoinTier(context, coins: 10, price: '₹29', bonus: ''),
                const SizedBox(width: 10),
                _buildCoinTier(context, coins: 50, price: '₹99', bonus: '+5 FREE'),
                const SizedBox(width: 10),
                _buildCoinTier(context, coins: 150, price: '₹199', bonus: '+25 FREE'),
              ],
            ),
            const SizedBox(height: 24),

            // Ledger / History
            const Text(
              'Transaction History',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 12),

            transactionsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppColors.vipGold)),
              error: (err, _) => Text('Could not load transactions: $err', style: const TextStyle(color: AppColors.textMuted)),
              data: (txList) {
                if (txList.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Text(
                        'No transactions yet. Unlocked episodes or purchased coins will be listed here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                      ),
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: txList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final tx = txList[index];
                    return _buildTransactionTile(tx);
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCoinTier(BuildContext context, {required int coins, required String price, required String bonus}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: Column(
          children: [
            if (bonus.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.freeBadge,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(bonus, style: const TextStyle(color: Colors.black, fontSize: 7, fontWeight: FontWeight.w900)),
              ),
            Text(
              '$coins XP',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.xpAmber),
            ),
            const SizedBox(height: 4),
            Text(price, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 28,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.surfaceElevated,
                  padding: EdgeInsets.zero,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Starting checkout for $coins XP Coins ($price)')),
                  );
                },
                child: const Text('Buy', style: TextStyle(color: AppColors.vipGold, fontSize: 11, fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionTile(XpTransactionModel tx) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.surfaceBorder, width: 0.8),
      ),
      child: Row(
        children: [
          Icon(
            tx.isPositive ? Icons.add_circle_outline_rounded : Icons.remove_circle_outline_rounded,
            color: tx.isPositive ? AppColors.freeBadge : AppColors.redAccent,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.description,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                Text(
                  DateFormat.yMMMd().format(tx.createdAt),
                  style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          Text(
            '${tx.isPositive ? '+' : ''}${tx.amount} XP',
            style: TextStyle(
              color: tx.isPositive ? AppColors.freeBadge : AppColors.redAccent,
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
