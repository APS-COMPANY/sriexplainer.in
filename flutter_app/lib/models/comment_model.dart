class CommentModel {
  final String id;
  final String episodeId;
  final String userId;
  final String username;
  final String? userAvatar;
  final bool isUserVip;
  final bool isUserAdmin;
  final String text;
  final int likes;
  final bool isLikedByMe;
  final bool isPinned;
  final String? timestamp;
  final String createdAt;
  final List<CommentModel> replies;

  CommentModel({
    required this.id,
    required this.episodeId,
    required this.userId,
    required this.username,
    this.userAvatar,
    this.isUserVip = false,
    this.isUserAdmin = false,
    required this.text,
    this.likes = 0,
    this.isLikedByMe = false,
    this.isPinned = false,
    this.timestamp,
    required this.createdAt,
    this.replies = const [],
  });

  factory CommentModel.fromJson(Map<String, dynamic> json) {
    List<CommentModel> parsedReplies = [];
    if (json['replies'] is List) {
      parsedReplies = (json['replies'] as List)
          .map((r) => CommentModel.fromJson(Map<String, dynamic>.from(r)))
          .toList();
    }

    final user = json['user'] is Map ? json['user'] : null;

    return CommentModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      episodeId: (json['episodeId'] ?? json['episode_id'] ?? '').toString(),
      userId: (json['userId'] ?? user?['id'] ?? '').toString(),
      username: json['username'] ?? user?['username'] ?? user?['name'] ?? 'Viewer',
      userAvatar: json['userAvatar'] ?? user?['avatar'] ?? user?['image'],
      isUserVip: json['isVip'] == true || user?['isVip'] == true,
      isUserAdmin: json['isAdmin'] == true || user?['role'] == 'admin',
      text: json['text'] ?? json['content'] ?? '',
      likes: int.tryParse(json['likes']?.toString() ?? '0') ?? 0,
      isLikedByMe: json['isLikedByMe'] == true,
      isPinned: json['isPinned'] == true || json['pinned'] == 1,
      timestamp: json['timestamp']?.toString(),
      createdAt: json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
      replies: parsedReplies,
    );
  }

  CommentModel copyWith({
    int? likes,
    bool? isLikedByMe,
  }) {
    return CommentModel(
      id: id,
      episodeId: episodeId,
      userId: userId,
      username: username,
      userAvatar: userAvatar,
      isUserVip: isUserVip,
      isUserAdmin: isUserAdmin,
      text: text,
      likes: likes ?? this.likes,
      isLikedByMe: isLikedByMe ?? this.isLikedByMe,
      isPinned: isPinned,
      timestamp: timestamp,
      createdAt: createdAt,
      replies: replies,
    );
  }
}
