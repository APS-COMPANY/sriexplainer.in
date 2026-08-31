import 'package:google_sign_in/google_sign_in.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../models/user_model.dart';

class AuthRepository {
  final ApiClient _client = ApiClient();
  final SecureStorageService _storage = SecureStorageService();
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      ApiEndpoints.login,
      data: {
        'email': email.trim().toLowerCase(),
        'password': password,
      },
    );

    final token = response['token'] ?? response['accessToken'];
    if (token != null) {
      await _storage.saveToken(token.toString());
    }

    final userData = response['user'] ?? response['data'] ?? response;
    return UserModel.fromJson(Map<String, dynamic>.from(userData));
  }

  Future<UserModel> register({
    required String username,
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      ApiEndpoints.register,
      data: {
        'username': username.trim(),
        'email': email.trim().toLowerCase(),
        'password': password,
      },
    );

    final token = response['token'] ?? response['accessToken'];
    if (token != null) {
      await _storage.saveToken(token.toString());
    }

    final userData = response['user'] ?? response['data'] ?? response;
    return UserModel.fromJson(Map<String, dynamic>.from(userData));
  }

  Future<UserModel> loginWithGoogle() async {
    final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
    if (googleUser == null) {
      throw Exception('Google sign-in was cancelled by the user.');
    }

    final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
    final String? idToken = googleAuth.idToken;

    final response = await _client.post(
      ApiEndpoints.googleAuth,
      data: {
        'credential': idToken,
        'email': googleUser.email,
        'name': googleUser.displayName ?? 'Google User',
        'avatar': googleUser.photoUrl ?? '',
      },
    );

    final token = response['token'] ?? response['accessToken'];
    if (token != null) {
      await _storage.saveToken(token.toString());
    }

    final userData = response['user'] ?? response['data'] ?? response;
    return UserModel.fromJson(Map<String, dynamic>.from(userData));
  }

  Future<UserModel?> getMe() async {
    final token = await _storage.getToken();
    if (token == null || token.isEmpty) return null;

    try {
      final response = await _client.get(ApiEndpoints.me);
      final userData = response['user'] ?? response['data'] ?? response;
      return UserModel.fromJson(Map<String, dynamic>.from(userData));
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    await _storage.deleteToken();
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
  }
}
