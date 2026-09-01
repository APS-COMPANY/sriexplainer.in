import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';

class PaymentRepository {
  final ApiClient _client = ApiClient();

  Future<Map<String, dynamic>> createCashfreeOrder({
    required String planId,
    required double amount,
  }) async {
    final response = await _client.post(
      ApiEndpoints.cashfreeCreateOrder,
      data: {
        'plan': planId,
        'amount': amount.toInt(),
      },
    );

    return Map<String, dynamic>.from(response);
  }

  Future<Map<String, dynamic>> verifyCashfreePayment({
    required String orderId,
  }) async {
    final response = await _client.post(
      ApiEndpoints.cashfreeVerify,
      data: {
        'order_id': orderId,
      },
    );

    return Map<String, dynamic>.from(response);
  }
}
