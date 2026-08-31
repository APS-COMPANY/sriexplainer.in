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
      _loadEmbedHtml();
    }
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) {
            if (mounted) {
              setState(() {
                _isLoading = false;
              });
            }
          },
          onNavigationRequest: (request) {
            // Only allow Rumble domain and essential subdomains
            if (request.url.contains('rumble.com') || request.url.startsWith('about:blank')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      );

    _loadEmbedHtml();
  }

  void _loadEmbedHtml() {
    final String url = widget.embedUrl.trim();
    String iframeSrc = url;

    // Ensure embed format
    if (!iframeSrc.contains('/embed/')) {
      if (iframeSrc.contains('rumble.com/v')) {
        final uri = Uri.tryParse(iframeSrc);
        final videoId = uri?.pathSegments.isNotEmpty == true ? uri!.pathSegments.last.split('-').first : '';
        iframeSrc = 'https://rumble.com/embed/$videoId/?pub=4';
      }
    }

    final html = '''
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html { width: 100%; height: 100%; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            iframe { width: 100%; height: 100%; border: 0; }
          </style>
        </head>
        <body>
          <iframe 
            src="$iframeSrc" 
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
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        color: Colors.black,
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(color: AppColors.vipGold),
              ),
            // Floating Fullscreen Toggle
            Positioned(
              top: 8,
              right: 8,
              child: GestureDetector(
                onTap: _toggleFullscreen,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(6),
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
