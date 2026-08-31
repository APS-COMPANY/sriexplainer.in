class UserModel {
  final String id;
  final String email;
  final String username;
  final String role;
  final int xpBalance;
  final String? subscriptionEndsAt;
  final bool isVipActive;
  final String? avatar;
  final String? phone;

  UserModel({
    required this.id,
    required this.email,
    required this.username,
    this.role = 'user',
    this.xpBalance = 0,
    this.subscriptionEndsAt,
    this.isVipActive = false,
    this.avatar,
    this.phone,
  });

  bool get isVip {
    if (isVipActive) return true;
    if (role == 'admin' || role == 'main_admin') return true;
    if (subscriptionEndsAt != null) {
      final ends = DateTime.tryParse(subscriptionEndsAt!);
      if (ends != null && ends.isAfter(DateTime.now())) return true;
    }
    return false;
  }

  bool get isAdmin => role == 'admin' || role == 'main_admin';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final endsAt = json['subscriptionEndsAt']?.toString();
    bool vip = json['isVipActive'] == true || json['isVip'] == true;
    if (endsAt != null) {
      final dt = DateTime.tryParse(endsAt);
      if (dt != null && dt.isAfter(DateTime.now())) {
        vip = true;
      }
    }

    return UserModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      email: json['email'] ?? '',
      username: json['username'] ?? json['name'] ?? json['email']?.toString().split('@').first ?? 'User',
      role: json['role'] ?? 'user',
      xpBalance: int.tryParse(json['xpBalance']?.toString() ?? json['coins']?.toString() ?? '0') ?? 0,
      subscriptionEndsAt: endsAt,
      isVipActive: vip,
      avatar: json['avatar'] ?? json['image'],
      phone: json['phone'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'username': username,
      'role': role,
      'xpBalance': xpBalance,
      'subscriptionEndsAt': subscriptionEndsAt,
      'isVipActive': isVipActive,
      'avatar': avatar,
      'phone': phone,
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? username,
    String? role,
    int? xpBalance,
    String? subscriptionEndsAt,
    bool? isVipActive,
    String? avatar,
    String? phone,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      username: username ?? this.username,
      role: role ?? this.role,
      xpBalance: xpBalance ?? this.xpBalance,
      subscriptionEndsAt: subscriptionEndsAt ?? this.subscriptionEndsAt,
      isVipActive: isVipActive ?? this.isVipActive,
      avatar: avatar ?? this.avatar,
      phone: phone ?? this.phone,
    );
  }
}
