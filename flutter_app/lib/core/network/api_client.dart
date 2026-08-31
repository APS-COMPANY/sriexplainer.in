import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import 'api_exceptions.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio _dio;
  final SecureStorageService _storage = SecureStorageService();

  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.defaultBaseUrl,
        connectTimeout: const Duration(seconds: AppConfig.connectTimeoutSeconds),
        receiveTimeout: const Duration(seconds: AppConfig.apiTimeoutSeconds),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-Platform': 'android',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
            options.headers['Cookie'] = 'token=$token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) {
          final customException = _mapDioError(error);
          return handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              error: customException,
              type: error.type,
              response: error.response,
            ),
          );
        },
      ),
    );
  }

  Dio get dio => _dio;

  // GET
  Future<dynamic> get(
    String endpoint, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.get(
        endpoint,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }

  // POST
  Future<dynamic> post(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.post(
        endpoint,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }

  // PUT
  Future<dynamic> put(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.put(
        endpoint,
        data: data,
        queryParameters: queryParameters,
      );
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }

  // DELETE
  Future<dynamic> delete(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.delete(
        endpoint,
        data: data,
        queryParameters: queryParameters,
      );
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }

  ApiException _mapDioError(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return NetworkException();
    }

    final statusCode = error.response?.statusCode;
    final responseData = error.response?.data;
    String errorMessage = 'Something went wrong. Please try again.';

    if (responseData is Map && responseData.containsKey('error')) {
      errorMessage = responseData['error'].toString();
    } else if (responseData is Map && responseData.containsKey('message')) {
      errorMessage = responseData['message'].toString();
    }

    switch (statusCode) {
      case 401:
        return UnauthorizedException(message: errorMessage);
      case 402:
        return InsufficientCoinsException(
          currentBalance: responseData is Map ? (responseData['currentXp'] ?? 0) : 0,
          requiredCoins: responseData is Map ? (responseData['requiredXp'] ?? 0) : 0,
          message: errorMessage,
        );
      case 403:
        return ForbiddenException(message: errorMessage);
      default:
        return ApiException(
          message: errorMessage,
          statusCode: statusCode,
          data: responseData,
        );
    }
  }
}
