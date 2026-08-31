class SubscriptionPlanModel {
  final String id;
  final String title;
  final String durationText;
  final int days;
  final double price;
  final double? originalPrice;
  final List<String> features;
  final bool isPopular;
  final String badge;

  const SubscriptionPlanModel({
    required this.id,
    required this.title,
    required this.durationText,
    required this.days,
    required this.price,
    this.originalPrice,
    required this.features,
    this.isPopular = false,
    this.badge = '',
  });

  static const List<SubscriptionPlanModel> defaultPlans = [
    SubscriptionPlanModel(
      id: 'vip_monthly',
      title: 'Monthly VIP',
      durationText: '30 Days',
      days: 30,
      price: 99.0,
      originalPrice: 149.0,
      features: [
        '100% Ad-Free Video Streaming',
        'Early Access to Upcoming Episodes',
        'Exclusive VIP Golden Crown Badge',
        'Ultra HD (4K / 1080P) Playback',
        'VIP Priority Comments',
      ],
      isPopular: false,
    ),
    SubscriptionPlanModel(
      id: 'vip_quarterly',
      title: '3 Months VIP',
      durationText: '90 Days',
      days: 90,
      price: 249.0,
      originalPrice: 399.0,
      features: [
        'Everything in Monthly VIP',
        'Save 30% on subscription',
        '50 Free Bonus XP Coins',
        'Priority Customer Support',
      ],
      isPopular: true,
      badge: 'MOST POPULAR',
    ),
    SubscriptionPlanModel(
      id: 'vip_yearly',
      title: 'Annual VIP Pass',
      durationText: '365 Days',
      days: 365,
      price: 799.0,
      originalPrice: 1199.0,
      features: [
        'Everything in Quarterly VIP',
        'Save over 45% annually',
        '250 Free Bonus XP Coins',
        'VIP Hall of Fame Recognition',
        'Direct Suggestion Access for Recaps',
      ],
      isPopular: false,
      badge: 'BEST VALUE',
    ),
  ];
}
