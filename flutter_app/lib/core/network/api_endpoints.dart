class ApiEndpoints {
  // Authentication & Profile
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/me';
  static const String googleAuth = '/auth/google';

  // Series & Catalog
  static const String series = '/series';
  static String seriesDetail(String slug) => '/series/$slug';
  static String seriesReviews(String slug) => '/series/$slug/reviews';

  // Episodes & Streaming
  static const String episodes = '/episodes';
  static String episodeDetail(String id) => '/episodes/$id';
  static String episodeUnlock(String id) => '/episodes/$id/unlock';
  static String episodeHype(String id) => '/episodes/$id/hype';
  static String episodeLike(String id) => '/episodes/$id/like';
  static String episodeView(String id) => '/episodes/$id/view';
  static String episodeComments(String id) => '/episodes/$id/comments';

  // Upcoming & Schedule
  static const String upcoming = '/upcoming';

  // Comments
  static String commentLike(String id) => '/comments/$id/like';

  // History & Playlist
  static const String history = '/history';
  static const String continueWatching = '/history/continue-watching';
  static const String historyProgress = '/history/progress';
  static const String favorites = '/favorites';
  static String favoriteDetail(String id) => '/favorites/$id';
  static const String watchLater = '/watch-later';

  // VIP & Payments (Cashfree)
  static const String cashfreeCreateOrder = '/payments/cashfree/order';
  static const String cashfreeVerify = '/cashfree/verify';

  // XP Coins & Gamification
  static const String xpTransactions = '/user/xp-transactions';

  // General & Announcements
  static const String activeAnnouncements = '/announcements/active';
  static const String slides = '/slides';
  static const String search = '/search';
}
