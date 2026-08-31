import 'package:flutter/material.dart';

class AppColors {
  // Backgrounds & Surface (Obsidian / Dark Cinematic)
  static const Color background = Color(0xFF0A0A0A);
  static const Color surface = Color(0xFF141414);
  static const Color surfaceElevated = Color(0xFF1C1C1E);
  static const Color surfaceBorder = Color(0xFF27272A);

  // VIP Gold Accents
  static const Color vipGold = Color(0xFFF59E0B);
  static const Color vipGoldLight = Color(0xFFFBBF24);
  static const Color vipGoldDark = Color(0xFFD97706);
  static const Color vipBadgeBg = Color(0x33F59E0B);

  // XP Coin Theme
  static const Color xpAmber = Color(0xFFF59E0B);
  static const Color xpBadgeBg = Color(0xFF292524);

  // Status & Badges
  static const Color freeBadge = Color(0xFF10B981);
  static const Color qualityBadgeBg = Color(0xCC000000);
  static const Color qualityBadgeBorder = Color(0xFF3F3F46);

  // Text Colors
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF71717A);

  // Accents & Gradients
  static const Color redAccent = Color(0xFFEF4444);
  static const Color blueAccent = Color(0xFF3B82F6);
  static const Color purpleAccent = Color(0xFF8B5CF6);

  // Gradient definitions
  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFFBBF24), Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardOverlayGradient = LinearGradient(
    colors: [Colors.transparent, Color(0xCC000000), Color(0xFF0A0A0A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    stops: [0.0, 0.6, 1.0],
  );

  static const LinearGradient heroGradient = LinearGradient(
    colors: [Colors.transparent, Color(0x99000000), Color(0xFF0A0A0A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    stops: [0.3, 0.7, 1.0],
  );
}
