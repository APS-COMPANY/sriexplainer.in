import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/payment_repository.dart';
import '../providers/vip_provider.dart';

class CashfreeCheckoutScreen extends ConsumerStatefulWidget {
  final String paymentSessionId;
  final String orderId;
  final String environment;
  final String title;
  final double amount;

  const CashfreeCheckoutScreen({
    super.key,
    required this.paymentSessionId,
    required this.orderId,
    this.environment = 'PRODUCTION',
    required this.title,
    required this.amount,
  });

  static Future<bool?> open(
    BuildContext context, {
    required String paymentSessionId,
    required String orderId,
    String environment = 'PRODUCTION',
    required String title,
    required double amount,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => CashfreeCheckoutScreen(
          paymentSessionId: paymentSessionId,
          orderId: orderId,
          environment: environment,
          title: title,
          amount: amount,
        ),
      ),
    );
  }

  @override
  ConsumerState<CashfreeCheckoutScreen> createState() => _CashfreeCheckoutScreenState();
}

class _CashfreeCheckoutScreenState extends ConsumerState<CashfreeCheckoutScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _isVerifying = false;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    final mode = widget.environment.toUpperCase() == 'PRODUCTION' ? 'production' : 'sandbox';

    final html = '''
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>Cashfree Checkout</title>
          <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background-color: #0b0b0f;
              color: #ffffff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(255, 184, 0, 0.2);
              border-top-color: #ffb800;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .text {
              font-size: 14px;
              color: #a0a0b0;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <div class="text">Connecting to Secure Payment Gateway...</div>
          <script>
            window.addEventListener('DOMContentLoaded', function() {
              try {
                if (typeof Cashfree !== 'undefined') {
                  const cashfree = Cashfree({ mode: "$mode" });
                  cashfree.checkout({
                    paymentSessionId: "${widget.paymentSessionId}",
                    redirectTarget: "_self"
                  });
                } else {
                  document.querySelector('.text').innerText = 'Loading Cashfree SDK...';
                }
              } catch (e) {
                console.error(e);
              }
            });
          </script>
        </body>
      </html>
    ''';

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.background)
      ..setUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
          onNavigationRequest: (NavigationRequest request) async {
            final url = request.url;

            // Handle UPI Intent links (GPay, PhonePe, Paytm, BHIM, etc.)
            if (url.startsWith('upi://') ||
                url.startsWith('phonepe://') ||
                url.startsWith('paytmmp://') ||
                url.startsWith('tez://') ||
                url.startsWith('gpay://') ||
                url.startsWith('intent://')) {
              try {
                final uri = Uri.parse(url);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalNonBrowserApplication);
                } else {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              } catch (_) {}
              return NavigationDecision.prevent;
            }

            // Check if returned to profile / return_url after completion
            if (url.contains('order_id=') || url.contains('/profile') || url.contains('sriexplainer.in')) {
              final uri = Uri.tryParse(url);
              final returnedOrderId = uri?.queryParameters['order_id'] ?? widget.orderId;
              _verifyAndFinish(returnedOrderId);
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      );

    _controller.loadHtmlString(html, baseUrl: 'https://sriexplainer.in');
  }

  Future<void> _verifyAndFinish(String orderId) async {
    if (_isVerifying) return;
    setState(() {
      _isVerifying = true;
      _statusMessage = 'Verifying your payment with Cashfree...';
    });

    try {
      final repo = ref.read(paymentRepositoryProvider);
      final res = await repo.verifyCashfreePayment(orderId: orderId);

      final status = (res['status'] ?? res['order_status'] ?? '').toString().toUpperCase();
      final isPaid = status == 'PAID' || status == 'SUCCESS' || res['success'] == true || res['alreadyVerified'] == true;

      if (isPaid) {
        // Refresh Auth & Balance
        await ref.read(authProvider.notifier).checkAuth();

        if (mounted) {
          setState(() {
            _statusMessage = '🎉 Payment Verified Successfully!';
          });
          await Future.delayed(const Duration(milliseconds: 600));
          if (mounted) {
            Navigator.of(context).pop(true);
          }
        }
      } else {
        if (mounted) {
          setState(() {
            _isVerifying = false;
            _statusMessage = 'Payment not completed yet.';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isVerifying = false;
          _statusMessage = 'Verification pending. Please check wallet balance.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Colors.white),
          onPressed: () {
            // Confirm verification on close if order was submitted
            _showExitConfirmDialog();
          },
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
            ),
            Text(
              'Amount: ₹${widget.amount.toInt()} • Cashfree Secure',
              style: const TextStyle(fontSize: 11, color: AppColors.vipGold, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () => _verifyAndFinish(widget.orderId),
            icon: const Icon(Icons.refresh_rounded, size: 16, color: AppColors.vipGold),
            label: const Text('Verify', style: TextStyle(color: AppColors.vipGold, fontSize: 12, fontWeight: FontWeight.w800)),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading || _isVerifying)
            Container(
              color: Colors.black.withOpacity(0.75),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  margin: const EdgeInsets.symmetric(horizontal: 32),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.surfaceBorder),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: AppColors.vipGold),
                      const SizedBox(height: 16),
                      Text(
                        _statusMessage ?? 'Opening Cashfree Gateway...',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showExitConfirmDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Payment?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        content: const Text(
          'If you have completed the payment in UPI or your banking app, tap "Verify Payment" to credit your account.',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context, false);
            },
            child: const Text('Exit', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.vipGold),
            onPressed: () {
              Navigator.pop(ctx);
              _verifyAndFinish(widget.orderId);
            },
            child: const Text('Verify Payment', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}
