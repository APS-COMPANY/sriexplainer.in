class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() => message;
}

class NetworkException extends ApiException {
  NetworkException({String message = 'No internet connection. Please check your network.'})
      : super(message: message, statusCode: null);
}

class UnauthorizedException extends ApiException {
  UnauthorizedException({String message = 'Session expired. Please log in again.'})
      : super(message: message, statusCode: 401);
}

class ForbiddenException extends ApiException {
  ForbiddenException({String message = 'VIP membership required to access this content.'})
      : super(message: message, statusCode: 403);
}

class InsufficientCoinsException extends ApiException {
  final int currentBalance;
  final int requiredCoins;

  InsufficientCoinsException({
    required this.currentBalance,
    required this.requiredCoins,
    String message = 'Insufficient XP Coins. Please top up your wallet.',
  }) : super(message: message, statusCode: 402);
}
