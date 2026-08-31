import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class XpCoinBadge extends StatelessWidget {
  final int coins;
  final double fontSize;
  final bool isCost;

  const XpCoinBadge({
    super.key,
    required this.coins,
    this.fontSize = 11.0,
    this.isCost = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.xpBadgeBg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: AppColors.xpAmber.withOpacity(0.5),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.monetization_on,
            size: 13,
            color: AppColors.xpAmber,
          ),
          const SizedBox(width: 3),
          Text(
            isCost ? '$coins XP' : '$coins',
            style: TextStyle(
              color: AppColors.xpAmber,
              fontSize: fontSize,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}
