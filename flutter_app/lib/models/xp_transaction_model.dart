class XpTransactionModel {
  final String id;
  final String userId;
  final int amount;
  final String type; // 'earned', 'spent', 'purchase', 'grant', 'refund'
  final String description;
  final String? episodeId;
  final String? episodeTitle;
  final DateTime createdAt;

  XpTransactionModel({
    required this.id,
    required this.userId,
    required this.amount,
    required this.type,
    required this.description,
    this.episodeId,
    this.episodeTitle,
    required this.createdAt,
  });

  bool get isPositive => amount > 0 || type == 'earned' || type == 'purchase' || type == 'grant' || type == 'refund';

  factory XpTransactionModel.fromJson(Map<String, dynamic> json) {
    return XpTransactionModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      userId: (json['userId'] ?? '').toString(),
      amount: int.tryParse(json['amount']?.toString() ?? '0') ?? 0,
      type: json['type'] ?? (json['amount'] != null && (json['amount'] as int) < 0 ? 'spent' : 'earned'),
      description: json['description'] ?? json['reason'] ?? 'XP Coin Transaction',
      episodeId: json['episodeId']?.toString(),
      episodeTitle: json['episodeTitle']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
