import 'dart:async';
import 'package:flutter/material.dart';
import '../../../models/episode_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';

class AutoNextPrompt extends StatefulWidget {
  final EpisodeModel nextEpisode;
  final VoidCallback onPlayNext;
  final VoidCallback onCancel;

  const AutoNextPrompt({
    super.key,
    required this.nextEpisode,
    required this.onPlayNext,
    required this.onCancel,
  });

  @override
  State<AutoNextPrompt> createState() => _AutoNextPromptState();
}

class _AutoNextPromptState extends State<AutoNextPrompt> {
  int _secondsLeft = 10;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft <= 1) {
        timer.cancel();
        widget.onPlayNext();
      } else {
        setState(() {
          _secondsLeft--;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.vipGold.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Next Episode in $_secondsLeft s',
                style: const TextStyle(
                  color: AppColors.vipGold,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textMuted),
                onPressed: widget.onCancel,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            widget.nextEpisode.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: PrimaryButton(
                  text: 'Play Now',
                  icon: Icons.play_arrow_rounded,
                  height: 38,
                  onPressed: widget.onPlayNext,
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: widget.onCancel,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.surfaceBorder),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Cancel', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
