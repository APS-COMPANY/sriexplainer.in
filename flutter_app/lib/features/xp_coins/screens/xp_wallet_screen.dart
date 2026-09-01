import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/xp_transaction_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../vip/providers/vip_provider.dart';
import '../../vip/screens/cashfree_checkout_screen.dart';
import '../providers/xp_provider.dart';

class XpWalletScreen extends ConsumerStatefulWidget {
  const XpWalletScreen({super.key});

  @override
  ConsumerState<XpWalletScreen> createState() => _XpWalletScreenState();
}

class _XpWalletScreenState extends ConsumerState<XpWalletScreen> {
  bool _isLoading = false;

  Future<void> _handleBuyCoins({
    required String planKey,
    required int coins,
    required double price,
  }) async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to purchase XP Coins.')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final repo = ref.read(paymentRepositoryProvider);
      final res = await repo.createCashfreeOrder(planId: planKey, amount: price);

      final orderId = (res['order_id'] ?? res['orderId'] ?? res['id']).toString();
      final sessionId = (res['payment_session_id'] ?? res['paymentSessionId'] ?? '').toString();
      final environment = (res['environment'] ?? 'PRODUCTION').toString();

      if (sessionId.isNotEmpty && mounted) {
        setState(() => _isLoading = false);

        final success = await CashfreeCheckoutScreen.open(
          context,
          paymentSessionId: sessionId,
          orderId: orderId,
          environment: environment,
          title: '$coins XP Coins Pack',
          amount: price,
        );

        if (success == true && mounted) {
          ref.invalidate(xpTransactionsProvider);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppColors.surfaceElevated,
              content: Text('🎉 $coins XP Coins added successfully to your wallet!'),
            ),
          );
        }
      } else {
        throw Exception(res['message'] ?? 'Failed to initialize Cashfree checkout');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.surfaceElevated,
            content: Text(e.toString().replaceAll('Exception:', '').trim()),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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

            // Top-Up Packages Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Top-Up Packages',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                if (_isLoading)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.vipGold),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // 3 Standard Tiers from Website
            Row(
              children: [
                _buildCoinTier(
                  planKey: '60_coins',
                  coins: 60,
                  price: 29,
                  badge: 'STARTER PACK',
                  perks: 'Unlock 12 Eps',
                ),
                const SizedBox(width: 10),
                _buildCoinTier(
                  planKey: '110_coins',
                  coins: 110,
                  price: 49,
                  badge: 'MOST POPULAR',
                  perks: 'Unlock 22 Eps',
                  isPopular: true,
                ),
                const SizedBox(width: 10),
                _buildCoinTier(
                  planKey: '220_coins',
                  coins: 220,
                  price: 99,
                  badge: 'MEGA VALUE',
                  perks: 'Unlock 44 Eps',
                ),
              ],
            ),
            const SizedBox(height: 28),

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
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildCoinTier({
    required String planKey,
    required int coins,
    required double price,
    required String badge,
    required String perks,
    bool isPopular = false,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isPopular ? AppColors.vipGold : AppColors.surfaceBorder,
            width: isPopular ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: isPopular ? AppColors.vipGold : AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                badge,
                style: TextStyle(
                  color: isPopular ? Colors.black : AppColors.textMuted,
                  fontSize: 7.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Text(
              '$coins XP',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.xpAmber),
            ),
            const SizedBox(height: 3),
            Text(
              '₹${price.toInt()}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(
              perks,
              style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 30,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isPopular ? AppColors.vipGold : AppColors.surfaceElevated,
                  padding: EdgeInsets.zero,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _isLoading
                    ? null
                    : () => _handleBuyCoins(
                          planKey: planKey,
                          coins: coins,
                          price: price,
                        ),
                child: Text(
                  'Buy Coins',
                  style: TextStyle(
                    color: isPopular ? Colors.black : AppColors.vipGold,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
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
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceBorder, width: 0.8),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: tx.isCredit ? AppColors.freeBadge.withOpacity(0.2) : AppColors.redAccent.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              tx.isCredit ? Icons.add_rounded : Icons.remove_rounded,
              color: tx.isCredit ? AppColors.freeBadge : AppColors.redAccent,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.description,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                const SizedBox(height: 2),
                Text(
                  DateFormat('MMM dd, yyyy • hh:mm a').format(tx.createdAt),
                  style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          Text(
            tx.amountFormatted,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: tx.isCredit ? AppColors.freeBadge : AppColors.redAccent,
            ),
          ),
        ],
      ),
    );
  }
}
