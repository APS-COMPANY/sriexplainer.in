import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../models/comment_model.dart';

class CommentRepository {
  final ApiClient _client = ApiClient();

  Future<List<CommentModel>> getComments(String episodeId) async {
    final response = await _client.get(ApiEndpoints.episodeComments(episodeId));
    final List rawList = response is List ? response : (response['comments'] ?? response['data'] ?? []);
    return rawList.map((c) => CommentModel.fromJson(Map<String, dynamic>.from(c))).toList();
  }

  Future<CommentModel> postComment({
    required String episodeId,
    required String text,
    String? parentId,
    String? timestamp,
  }) async {
    final response = await _client.post(
      ApiEndpoints.episodeComments(episodeId),
      data: {
        'text': text.trim(),
        if (parentId != null) 'parentId': parentId,
        if (timestamp != null) 'timestamp': timestamp,
      },
    );

    final data = response['comment'] ?? response['data'] ?? response;
    return CommentModel.fromJson(Map<String, dynamic>.from(data));
  }

  Future<void> likeComment(String commentId) async {
    await _client.post(ApiEndpoints.commentLike(commentId));
  }
}
