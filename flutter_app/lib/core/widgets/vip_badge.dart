import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class VipBadge extends StatelessWidget {
  final double size;
  final bool showText;

  const VipBadge({
    super.key,
    this.size = 14.0,
    this.showText = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        gradient: AppColors.goldGradient,
        borderRadius: BorderRadius.circular(5),
        boxShadow: [
          BoxShadow(
            color: AppColors.vipGold.withOpacity(0.3),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.workspace_premium, size: size, color: Colors.black),
          if (showText) ...[
            const SizedBox(width: 3),
            const Text(
              'VIP',
              style: TextStyle(
                color: Colors.black,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
