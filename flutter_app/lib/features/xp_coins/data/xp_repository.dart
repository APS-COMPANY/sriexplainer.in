import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../models/xp_transaction_model.dart';

class XpRepository {
  final ApiClient _client = ApiClient();

  Future<List<XpTransactionModel>> getTransactions() async {
    try {
      final response = await _client.get(ApiEndpoints.xpTransactions);
      final List rawList = response is List ? response : (response['transactions'] ?? response['data'] ?? []);
      return rawList.map((t) => XpTransactionModel.fromJson(Map<String, dynamic>.from(t))).toList();
    } catch (_) {
      return [];
    }
  }
}
