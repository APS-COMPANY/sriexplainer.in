class AppConfig {
  static const String appName = 'Sri Explainer';
  static const String packageName = 'in.sriexplainer.app';
  static const String appVersion = '1.0.0';
  static const String buildNumber = '1';

  // Base API configuration (Reuses official production website backend)
  static const String defaultBaseUrl = 'https://sriexplainer.in/api';
  static const String siteUrl = 'https://sriexplainer.in';
  
  // Google OAuth 2.0 Web Client ID (Used for backend verification)
  static const String googleServerClientId = '166190554359-lgi7mit0dtto8fc74tsm5cl6le8pbrn8.apps.googleusercontent.com';

  // Storage Keys
  static const String keyAuthToken = 'sri_auth_token';
  static const String keyUserData = 'sri_user_data';
  static const String keyWatchHistory = 'sri_watch_history';
  static const String keyMyList = 'sri_my_list';
  static const String keyUnlockedEpisodes = 'sri_unlocked_episodes';
  static const String keyCachedSeries = 'sri_cached_series';

  // Ad & Network configuration
  static const int apiTimeoutSeconds = 15;
  static const int connectTimeoutSeconds = 10;

  /// Resolves relative API image paths like '/api/uploads/xxx.png' or '/uploads/xxx.png' to absolute URLs
  static String resolveImageUrl(String? url) {
    if (url == null || url.trim().isEmpty) return '';
    final clean = url.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    if (clean.startsWith('/')) {
      return '$siteUrl$clean';
    }
    return '$siteUrl/$clean';
  }
}
