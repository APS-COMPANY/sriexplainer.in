import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/xp_transaction_model.dart';
import '../data/xp_repository.dart';

final xpRepositoryProvider = Provider<XpRepository>((ref) => XpRepository());

final xpTransactionsProvider = FutureProvider<List<XpTransactionModel>>((ref) async {
  final repo = ref.watch(xpRepositoryProvider);
  return await repo.getTransactions();
});
