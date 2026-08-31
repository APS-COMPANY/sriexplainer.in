class AppConfig {
  static const String appName = 'Sri Explainer';
  static const String packageName = 'in.sriexplainer.app';
  static const String appVersion = '1.0.0';
  static const String buildNumber = '1';

  // Base API configuration (Reuses official production website backend)
  static const String defaultBaseUrl = 'https://sriexplainer.in/api';
  static const String siteUrl = 'https://sriexplainer.in';
  
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
}
