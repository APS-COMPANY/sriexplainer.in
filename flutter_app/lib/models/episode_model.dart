class EpisodeModel {
  final String id;
  final String seriesId;
  final String? seriesSlug;
  final String? seriesTitle;
  final dynamic number;
  final String title;
  final String description;
  final String thumbnail;
  final String embedUrl;
  final String access; // 'free', 'vip', 'coins'
  final int xpCost;
  final String quality;
  final int views;
  final int hypeCount;
  final int likes;
  final String? duration;
  final String? scheduledReleaseAt;
  final bool isUpcoming;
  final bool isUnlocked;
  final String? createdAt;

  EpisodeModel({
    required this.id,
    required this.seriesId,
    this.seriesSlug,
    this.seriesTitle,
    required this.number,
    required this.title,
    this.description = '',
    this.thumbnail = '',
    this.embedUrl = '',
    this.access = 'free',
    this.xpCost = 1,
    this.quality = '1080P',
    this.views = 0,
    this.hypeCount = 0,
    this.likes = 0,
    this.duration,
    this.scheduledReleaseAt,
    this.isUpcoming = false,
    this.isUnlocked = false,
    this.createdAt,
  });

  bool get isFree => access.toLowerCase() == 'free';
  bool get isVipOnly => access.toLowerCase() == 'vip' || access.toLowerCase() == 'premium';
  bool get isCoinUnlock => access.toLowerCase() == 'coins' || access.toLowerCase() == 'xp' || xpCost > 0 && !isFree && !isVipOnly;

  bool get isScheduledFuture {
    if (scheduledReleaseAt == null || scheduledReleaseAt!.isEmpty) return false;
    final dt = DateTime.tryParse(scheduledReleaseAt!);
    if (dt == null) return false;
    return dt.isAfter(DateTime.now());
  }

  DateTime? get releaseDateTime {
    if (scheduledReleaseAt == null) return null;
    return DateTime.tryParse(scheduledReleaseAt!);
  }

  factory EpisodeModel.fromJson(Map<String, dynamic> json) {
    final epId = (json['id'] ?? json['_id'] ?? '').toString();
    final rawAccess = (json['access'] ?? json['accessType'] ?? 'free').toString().toLowerCase();

    return EpisodeModel(
      id: epId,
      seriesId: (json['seriesId'] ?? json['series_id'] ?? '').toString(),
      seriesSlug: json['seriesSlug']?.toString(),
      seriesTitle: json['seriesTitle']?.toString() ?? json['series']?['title']?.toString(),
      number: json['number'] ?? json['episodeNumber'] ?? 1,
      title: json['title'] ?? 'Episode ${json['number'] ?? 1}',
      description: json['description'] ?? '',
      thumbnail: json['thumbnail'] ?? '',
      embedUrl: json['embedUrl'] ?? json['rumbleEmbed'] ?? json['url'] ?? '',
      access: rawAccess,
      xpCost: int.tryParse(json['xpCost']?.toString() ?? json['coinPrice']?.toString() ?? '1') ?? 1,
      quality: (json['quality'] ?? '1080P').toString().toUpperCase().trim(),
      views: int.tryParse(json['views']?.toString() ?? '0') ?? 0,
      hypeCount: int.tryParse(json['hypeCount']?.toString() ?? json['hypes']?.toString() ?? '0') ?? 0,
      likes: int.tryParse(json['likes']?.toString() ?? '0') ?? 0,
      duration: json['duration']?.toString(),
      scheduledReleaseAt: json['scheduledReleaseAt']?.toString(),
      isUpcoming: json['isUpcoming'] == 1 || json['isUpcoming'] == true,
      isUnlocked: json['isUnlocked'] == true || json['unlocked'] == true,
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'seriesId': seriesId,
      'seriesSlug': seriesSlug,
      'seriesTitle': seriesTitle,
      'number': number,
      'title': title,
      'description': description,
      'thumbnail': thumbnail,
      'embedUrl': embedUrl,
      'access': access,
      'xpCost': xpCost,
      'quality': quality,
      'views': views,
      'hypeCount': hypeCount,
      'likes': likes,
      'duration': duration,
      'scheduledReleaseAt': scheduledReleaseAt,
      'isUpcoming': isUpcoming,
      'isUnlocked': isUnlocked,
      'createdAt': createdAt,
    };
  }

  EpisodeModel copyWith({
    bool? isUnlocked,
    int? hypeCount,
    int? likes,
    int? views,
  }) {
    return EpisodeModel(
      id: id,
      seriesId: seriesId,
      seriesSlug: seriesSlug,
      seriesTitle: seriesTitle,
      number: number,
      title: title,
      description: description,
      thumbnail: thumbnail,
      embedUrl: embedUrl,
      access: access,
      xpCost: xpCost,
      quality: quality,
      views: views ?? this.views,
      hypeCount: hypeCount ?? this.hypeCount,
      likes: likes ?? this.likes,
      duration: duration,
      scheduledReleaseAt: scheduledReleaseAt,
      isUpcoming: isUpcoming,
      isUnlocked: isUnlocked ?? this.isUnlocked,
      createdAt: createdAt,
    );
  }
}
