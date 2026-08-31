import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class QualityBadge extends StatelessWidget {
  final String quality;
  final double fontSize;

  const QualityBadge({
    super.key,
    required this.quality,
    this.fontSize = 9.0,
  });

  @override
  Widget build(BuildContext context) {
    final cleanQuality = quality.trim().toUpperCase().replaceAll('QUALITY', '').trim();
    if (cleanQuality.isEmpty) return const SizedBox.shrink();

    final is4K = cleanQuality.contains('4K');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.qualityBadgeBg,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: is4K ? AppColors.vipGold.withOpacity(0.6) : AppColors.qualityBadgeBorder,
          width: 0.8,
        ),
      ),
      child: Text(
        cleanQuality,
        style: TextStyle(
          color: is4K ? AppColors.vipGold : Colors.white,
          fontSize: fontSize,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}
