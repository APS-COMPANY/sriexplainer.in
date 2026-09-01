import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/payment_repository.dart';
import '../../auth/providers/auth_provider.dart';

final paymentRepositoryProvider = Provider<PaymentRepository>((ref) => PaymentRepository());

class VipState {
  final bool isLoading;
  final String? error;
  final String? activeOrderId;
  final String? paymentSessionId;
  final bool isSuccess;

  VipState({
    this.isLoading = false,
    this.error,
    this.activeOrderId,
    this.paymentSessionId,
    this.isSuccess = false,
  });

  VipState copyWith({
    bool? isLoading,
    String? error,
    String? activeOrderId,
    String? paymentSessionId,
    bool? isSuccess,
  }) {
    return VipState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      activeOrderId: activeOrderId ?? this.activeOrderId,
      paymentSessionId: paymentSessionId ?? this.paymentSessionId,
      isSuccess: isSuccess ?? this.isSuccess,
    );
  }
}

class VipNotifier extends StateNotifier<VipState> {
  final PaymentRepository _repo;
  final Ref _ref;

  VipNotifier(this._repo, this._ref) : super(VipState());

  Future<Map<String, dynamic>?> initiatePayment({
    required String planId,
    required double amount,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _repo.createCashfreeOrder(planId: planId, amount: amount);
      final orderId = res['order_id'] ?? res['orderId'] ?? res['id'];
      final sessionId = res['payment_session_id'] ?? res['paymentSessionId'];

      state = state.copyWith(
        isLoading: false,
        activeOrderId: orderId?.toString(),
        paymentSessionId: sessionId?.toString(),
      );
      return res;
    } catch (e) {
      String errMsg = e.toString().replaceAll('Exception:', '').trim();
      state = state.copyWith(isLoading: false, error: errMsg);
      return null;
    }
  }

  Future<bool> verifyPayment(String orderId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _repo.verifyCashfreePayment(orderId: orderId);
      final status = (res['status'] ?? res['order_status'] ?? '').toString().toUpperCase();

      if (status == 'PAID' || status == 'SUCCESS' || res['success'] == true || res['alreadyVerified'] == true) {
        _ref.read(authProvider.notifier).activateVipLocally();
        state = state.copyWith(isLoading: false, isSuccess: true);
        return true;
      } else {
        state = state.copyWith(isLoading: false, error: 'Payment status: $status. Verification pending.');
        return false;
      }
    } catch (e) {
      String errMsg = e.toString().replaceAll('Exception:', '').trim();
      state = state.copyWith(isLoading: false, error: errMsg);
      return false;
    }
  }
}

final vipProvider = StateNotifierProvider<VipNotifier, VipState>((ref) {
  final repo = ref.watch(paymentRepositoryProvider);
  return VipNotifier(repo, ref);
});
