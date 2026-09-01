import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/theme/app_colors.dart';

class RumblePlayerView extends StatefulWidget {
  final String embedUrl;
  final VoidCallback? onVideoEnded;
  final Function(int seconds)? onProgressUpdate;

  const RumblePlayerView({
    super.key,
    required this.embedUrl,
    this.onVideoEnded,
    this.onProgressUpdate,
  });

  @override
  State<RumblePlayerView> createState() => _RumblePlayerViewState();
}

class _RumblePlayerViewState extends State<RumblePlayerView> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _isFullscreen = false;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  @override
  void didUpdateWidget(RumblePlayerView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.embedUrl != widget.embedUrl) {
      _loadPlayer();
    }
  }

  String _formatEmbedUrl(String raw) {
    var url = raw.trim();
    if (url.isEmpty) return '';

    // If iframe HTML string is passed, extract src
    if (url.contains('<iframe') && url.contains('src=')) {
      final match = RegExp(r'src=["\x27]([^"\x27]+)["\x27]').firstMatch(url);
      if (match != null && match.group(1) != null) {
        url = match.group(1)!;
      }
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://$url';
    }

    // Convert Rumble video watch URL to embed URL
    if (!url.contains('/embed/')) {
      if (url.contains('rumble.com/v')) {
        try {
          final uri = Uri.parse(url);
          final seg = uri.pathSegments.isNotEmpty ? uri.pathSegments.last : '';
          final videoId = seg.split('-').first;
          url = 'https://rumble.com/embed/$videoId/?pub=4';
        } catch (_) {}
      }
    }

    // Add query parameters for clean autoplay and clean UI
    try {
      final uri = Uri.parse(url);
      final params = Map<String, String>.from(uri.queryParameters);
      params['autoplay'] = '1';
      params['auto'] = '1';
      params['rel'] = '0';
      params['related'] = '0';
      params['api'] = '1';
      params['ui'] = '0';
      url = uri.replace(queryParameters: params).toString();
    } catch (_) {}

    return url;
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (NavigationRequest request) {
            final target = request.url.toLowerCase();
            // Allow embed iframe, blob, and data
            if (target.contains('rumble.com/embed') ||
                target.startsWith('about:') ||
                target.startsWith('data:') ||
                target.startsWith('blob:')) {
              return NavigationDecision.navigate;
            }
            // Block navigating to external rumble website / channel links
            return NavigationDecision.prevent;
          },
          onPageStarted: (_) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
            _injectAntiRumbleWatermarkScript();
          },
          onWebResourceError: (error) {
            if (mounted) setState(() => _isLoading = false);
          },
        ),
      );

    _loadPlayer();
  }

  void _injectAntiRumbleWatermarkScript() {
    const js = '''
      (function() {
        function removeWatermarks() {
          try {
            var elements = document.querySelectorAll('.rumble-watermark, .watermark, [class*="watermark"], [class*="rumble-logo"], svg[class*="logo"], a[href*="rumble.com"]');
            elements.forEach(function(el) {
              el.style.display = 'none';
              el.style.pointerEvents = 'none';
              el.style.opacity = '0';
              el.style.visibility = 'hidden';
            });
          } catch(e) {}
        }
        removeWatermarks();
        setInterval(removeWatermarks, 1000);
      })();
    ''';
    _controller.runJavaScript(js).catchError((_) {});
  }

  void _loadPlayer() {
    final finalUrl = _formatEmbedUrl(widget.embedUrl);
    if (finalUrl.isEmpty) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    final html = '''
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100vw; height: 100vh; background: #000000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            iframe { width: 100vw; height: 100vh; border: 0; }
            .rumble-watermark, .watermark, [class*="watermark"], [class*="rumble-logo"], a[href*="rumble.com"] {
              display: none !important;
              pointer-events: none !important;
              opacity: 0 !important;
            }
          </style>
        </head>
        <body>
          <iframe 
            src="$finalUrl" 
            allowfullscreen 
            webkitallowfullscreen 
            mozallowfullscreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture">
          </iframe>
        </body>
      </html>
    ''';

    _controller.loadHtmlString(html, baseUrl: 'https://rumble.com');
  }

  void _toggleFullscreen() {
    setState(() {
      _isFullscreen = !_isFullscreen;
    });

    if (_isFullscreen) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
  }

  @override
  void dispose() {
    if (_isFullscreen) {
      SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasUrl = widget.embedUrl.trim().isNotEmpty;

    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        color: Colors.black,
        child: Stack(
          children: [
            if (hasUrl)
              WebViewWidget(controller: _controller)
            else
              const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.video_camera_back_outlined, color: AppColors.textMuted, size: 40),
                    SizedBox(height: 8),
                    Text(
                      'Video Stream Loading or Unavailable',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
            if (_isLoading && hasUrl)
              const Center(
                child: CircularProgressIndicator(color: AppColors.vipGold),
              ),
            // Watermark click shield (prevents accidental taps from triggering external links)
            Positioned(
              bottom: 0,
              right: 0,
              width: 55,
              height: 45,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  // Absorb tap to prevent opening external site
                },
                child: Container(color: Colors.transparent),
              ),
            ),
            if (hasUrl)
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: _toggleFullscreen,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.surfaceBorder, width: 0.5),
                    ),
                    child: Icon(
                      _isFullscreen ? Icons.fullscreen_exit_rounded : Icons.fullscreen_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
