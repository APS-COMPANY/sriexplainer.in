class WatchHistoryModel {
  final String episodeId;
  final String seriesId;
  final String seriesTitle;
  final String episodeTitle;
  final dynamic episodeNumber;
  final String thumbnail;
  final int progressSeconds;
  final int durationSeconds;
  final double percentage;
  final DateTime updatedAt;

  WatchHistoryModel({
    required this.episodeId,
    required this.seriesId,
    required this.seriesTitle,
    required this.episodeTitle,
    this.episodeNumber = 1,
    required this.thumbnail,
    required this.progressSeconds,
    required this.durationSeconds,
    required this.percentage,
    required this.updatedAt,
  });

  factory WatchHistoryModel.fromJson(Map<String, dynamic> json) {
    final progress = int.tryParse(json['progressSeconds']?.toString() ?? json['progress']?.toString() ?? '0') ?? 0;
    final duration = int.tryParse(json['durationSeconds']?.toString() ?? json['duration']?.toString() ?? '0') ?? 0;
    final pct = duration > 0 ? (progress / duration) * 100 : (double.tryParse(json['percentage']?.toString() ?? '0') ?? 0.0);

    return WatchHistoryModel(
      episodeId: (json['episodeId'] ?? json['episode_id'] ?? '').toString(),
      seriesId: (json['seriesId'] ?? json['series_id'] ?? '').toString(),
      seriesTitle: json['seriesTitle'] ?? json['series']?['title'] ?? 'Series',
      episodeTitle: json['episodeTitle'] ?? json['episode']?['title'] ?? 'Episode',
      episodeNumber: json['episodeNumber'] ?? json['episode']?['number'] ?? 1,
      thumbnail: json['thumbnail'] ?? json['episode']?['thumbnail'] ?? '',
      progressSeconds: progress,
      durationSeconds: duration,
      percentage: pct.clamp(0.0, 100.0),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'episodeId': episodeId,
      'seriesId': seriesId,
      'seriesTitle': seriesTitle,
      'episodeTitle': episodeTitle,
      'episodeNumber': episodeNumber,
      'thumbnail': thumbnail,
      'progressSeconds': progressSeconds,
      'durationSeconds': durationSeconds,
      'percentage': percentage,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
