import '../core/config/app_config.dart';
import 'episode_model.dart';

class SeriesModel {
  final String id;
  final String title;
  final String slug;
  final String description;
  final String thumbnail;
  final String banner;
  final String genre;
  final List<String> genres;
  final int year;
  final String status;
  final int views;
  final int episodeCount;
  final int latestEpisodeNumber;
  final String latestEpisodeQuality;
  final bool isUpcoming;
  final bool isMovie;
  final bool featured;
  final bool trending;
  final List<EpisodeModel>? episodes;

  SeriesModel({
    required this.id,
    required this.title,
    required this.slug,
    this.description = '',
    this.thumbnail = '',
    this.banner = '',
    this.genre = '',
    this.genres = const [],
    this.year = 2026,
    this.status = 'Ongoing',
    this.views = 0,
    this.episodeCount = 0,
    this.latestEpisodeNumber = 0,
    this.latestEpisodeQuality = '1080P',
    this.isUpcoming = false,
    this.isMovie = false,
    this.featured = false,
    this.trending = false,
    this.episodes,
  });

  factory SeriesModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedGenres = [];
    if (json['genres'] is List) {
      parsedGenres = (json['genres'] as List).map((e) => e.toString()).toList();
    } else if (json['genre'] is String && (json['genre'] as String).isNotEmpty) {
      parsedGenres = (json['genre'] as String).split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    }

    List<EpisodeModel>? parsedEpisodes;
    final rawEpisodes = json['episodes'] ?? (json['series'] is Map ? json['series']['episodes'] : null);
    if (rawEpisodes is List) {
      parsedEpisodes = rawEpisodes
          .map((e) => EpisodeModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    final sId = (json['id'] ?? json['_id'] ?? '').toString();
    final slug = json['slug']?.toString() ?? sId;

    return SeriesModel(
      id: sId,
      title: json['title'] ?? 'Untitled Series',
      slug: slug,
      description: json['description'] ?? '',
      thumbnail: AppConfig.resolveImageUrl(json['thumbnail']?.toString()),
      banner: AppConfig.resolveImageUrl(json['banner']?.toString() ?? json['thumbnail']?.toString()),
      genre: json['genre'] ?? (parsedGenres.isNotEmpty ? parsedGenres.first : 'Anime'),
      genres: parsedGenres,
      year: int.tryParse(json['year']?.toString() ?? '2026') ?? 2026,
      status: json['status'] ?? (json['isUpcoming'] == 1 || json['isUpcoming'] == true ? 'Upcoming' : 'Ongoing'),
      views: int.tryParse(json['views']?.toString() ?? '0') ?? 0,
      episodeCount: int.tryParse(json['episodeCount']?.toString() ?? '0') ?? (parsedEpisodes?.length ?? 0),
      latestEpisodeNumber: int.tryParse(json['latestEpisodeNumber']?.toString() ?? '0') ?? 0,
      latestEpisodeQuality: json['latestEpisodeQuality'] ?? json['latestQuality'] ?? json['maxQuality'] ?? '1080P',
      isUpcoming: json['isUpcoming'] == 1 || json['isUpcoming'] == true,
      isMovie: json['isMovie'] == 1 || json['isMovie'] == true,
      featured: json['featured'] == 1 || json['featured'] == true,
      trending: json['trending'] == 1 || json['trending'] == true,
      episodes: parsedEpisodes,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'slug': slug,
      'description': description,
      'thumbnail': thumbnail,
      'banner': banner,
      'genre': genre,
      'genres': genres,
      'year': year,
      'status': status,
      'views': views,
      'episodeCount': episodeCount,
      'latestEpisodeNumber': latestEpisodeNumber,
      'latestEpisodeQuality': latestEpisodeQuality,
      'isUpcoming': isUpcoming,
      'isMovie': isMovie,
      'featured': featured,
      'trending': trending,
    };
  }
}
