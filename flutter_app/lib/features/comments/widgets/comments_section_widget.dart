import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../models/comment_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/vip_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/comment_repository.dart';

final commentRepositoryProvider = Provider<CommentRepository>((ref) => CommentRepository());

final commentsFutureProvider = FutureProvider.family<List<CommentModel>, String>((ref, episodeId) async {
  final repo = ref.watch(commentRepositoryProvider);
  return await repo.getComments(episodeId);
});

class CommentsSectionWidget extends ConsumerStatefulWidget {
  final String episodeId;

  const CommentsSectionWidget({
    super.key,
    required this.episodeId,
  });

  @override
  ConsumerState<CommentsSectionWidget> createState() => _CommentsSectionWidgetState();
}

class _CommentsSectionWidgetState extends ConsumerState<CommentsSectionWidget> {
  final TextEditingController _textController = TextEditingController();
  bool _isPosting = false;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _handlePostComment() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    final auth = ref.read(authProvider);
    if (!auth.isAuthenticated) {
      context.push('/login');
      return;
    }

    setState(() {
      _isPosting = true;
    });

    try {
      final repo = ref.read(commentRepositoryProvider);
      await repo.postComment(episodeId: widget.episodeId, text: text);
      _textController.clear();
      ref.refresh(commentsFutureProvider(widget.episodeId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to post comment: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isPosting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final commentsAsync = ref.watch(commentsFutureProvider(widget.episodeId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Icon(Icons.comment_rounded, size: 18, color: AppColors.vipGold),
              SizedBox(width: 8),
              Text(
                'Comments',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),

        // Comment Input Field
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _textController,
                  decoration: InputDecoration(
                    hintText: 'Add a timestamped comment...',
                    hintStyle: const TextStyle(fontSize: 12),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    suffixIcon: _isPosting
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.vipGold),
                            ),
                          )
                        : IconButton(
                            icon: const Icon(Icons.send_rounded, color: AppColors.vipGold, size: 18),
                            onPressed: _handlePostComment,
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Comments List
        commentsAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator(color: AppColors.vipGold, strokeWidth: 2)),
          ),
          error: (err, _) => Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Could not load comments: $err',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ),
          data: (comments) {
            if (comments.isEmpty) {
              return const Padding(
                padding: EdgeInsets.all(24),
                child: Center(
                  child: Text(
                    'No comments yet. Be the first to start the discussion!',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                ),
              );
            }

            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: comments.length,
              separatorBuilder: (_, __) => const Divider(color: AppColors.surfaceBorder, height: 16),
              itemBuilder: (context, index) {
                final comment = comments[index];
                return _buildCommentTile(comment);
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildCommentTile(CommentModel comment) {
    String formattedTime = '';
    try {
      final dt = DateTime.parse(comment.createdAt);
      formattedTime = DateFormat.yMMMd().format(dt);
    } catch (_) {}

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            CircleAvatar(
              radius: 14,
              backgroundColor: AppColors.surfaceElevated,
              child: Text(
                comment.username.isNotEmpty ? comment.username[0].toUpperCase() : 'U',
                style: const TextStyle(color: AppColors.vipGold, fontSize: 12, fontWeight: FontWeight.w800),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              comment.username,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
            const SizedBox(width: 6),
            if (comment.isUserVip) const VipBadge(size: 9, showText: false),
            if (comment.isPinned) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.redAccent.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'PINNED',
                  style: TextStyle(color: AppColors.redAccent, fontSize: 8, fontWeight: FontWeight.w900),
                ),
              ),
            ],
            const Spacer(),
            Text(
              formattedTime,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(left: 36, top: 4),
          child: Text(
            comment.text,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.3),
          ),
        ),
      ],
    );
  }
}
