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
        'planId': planId,
        'amount': amount,
        'platform': 'android',
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
        'orderId': orderId,
      },
    );

    return Map<String, dynamic>.from(response);
  }
}
