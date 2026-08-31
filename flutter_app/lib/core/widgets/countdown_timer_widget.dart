import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class CountdownTimerWidget extends StatefulWidget {
  final DateTime targetDate;
  final VoidCallback? onFinished;
  final bool compact;

  const CountdownTimerWidget({
    super.key,
    required this.targetDate,
    this.onFinished,
    this.compact = false,
  });

  @override
  State<CountdownTimerWidget> createState() => _CountdownTimerWidgetState();
}

class _CountdownTimerWidgetState extends State<CountdownTimerWidget> {
  Timer? _timer;
  Duration _difference = Duration.zero;

  @override
  void initState() {
    super.initState();
    _updateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateTime());
  }

  void _updateTime() {
    final now = DateTime.now();
    final diff = widget.targetDate.difference(now);

    if (diff.isNegative) {
      _timer?.cancel();
      if (mounted) {
        setState(() {
          _difference = Duration.zero;
        });
        widget.onFinished?.call();
      }
    } else {
      if (mounted) {
        setState(() {
          _difference = diff;
        });
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_difference == Duration.zero) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.freeBadge.withOpacity(0.2),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.freeBadge, width: 1),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle, size: 12, color: AppColors.freeBadge),
            SizedBox(width: 4),
            Text(
              'AVAILABLE NOW',
              style: TextStyle(
                color: AppColors.freeBadge,
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      );
    }

    final days = _difference.inDays;
    final hours = _difference.inHours % 24;
    final minutes = _difference.inMinutes % 60;
    final seconds = _difference.inSeconds % 60;

    String pad(int n) => n.toString().padLeft(2, '0');

    if (widget.compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.8),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.vipGold.withOpacity(0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.timer_outlined, size: 12, color: AppColors.vipGold),
            const SizedBox(width: 4),
            Text(
              '${days > 0 ? '${days}d ' : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}',
              style: const TextStyle(
                color: AppColors.vipGold,
                fontSize: 10,
                fontWeight: FontWeight.w800,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildSegment('${days}D'),
        const Text(' : ', style: TextStyle(color: Colors.white38, fontWeight: FontWeight.bold)),
        _buildSegment('${pad(hours)}H'),
        const Text(' : ', style: TextStyle(color: Colors.white38, fontWeight: FontWeight.bold)),
        _buildSegment('${pad(minutes)}M'),
        const Text(' : ', style: TextStyle(color: Colors.white38, fontWeight: FontWeight.bold)),
        _buildSegment('${pad(seconds)}S'),
      ],
    );
  }

  Widget _buildSegment(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.vipGold.withOpacity(0.3)),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: AppColors.vipGold,
          fontSize: 11,
          fontWeight: FontWeight.w900,
          fontFamily: 'monospace',
        ),
      ),
    );
  }
}
