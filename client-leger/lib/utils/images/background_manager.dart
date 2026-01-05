import 'package:client_leger/utils/constants/assets/background-images.dart';
import 'package:flutter/material.dart';

class AppBackground {
  static ImageProvider? _provider;
  static int? _cacheWidth;

  static ImageProvider getOrCreate(BuildContext context) {
    final media = MediaQuery.of(context);
    final pxWidth = (media.size.width * media.devicePixelRatio).round();

    if (_provider == null || _cacheWidth != pxWidth) {
      _cacheWidth = pxWidth;
      _provider = ResizeImage(BackgroundImages.background, width: pxWidth);
    }
    return _provider!;
  }

  static Future<void> precache(BuildContext context) async {
    final img = getOrCreate(context);
    await precacheImage(img, context);
  }
}

class AppMenuBackground {
  static const String _defaultFilename = 'title_page_bgd17.jpg';
  static String _assetPath = 'assets/images/backgrounds/$_defaultFilename';
  static AssetImage _asset = AssetImage(_assetPath);
  static ImageProvider? _provider;
  static int? _cacheWidth;
  // Notifies listeners that the background asset has changed so UIs can rebuild.
  static final ValueNotifier<int> revision = ValueNotifier<int>(0);

  // Update the background by filename (e.g., "title_page_bgd18.jpg").
  static void setByFilename(String filename) {
    if (filename.isEmpty) return;
    final clean = filename.split('/').last.trim();
    final newPath = 'assets/images/backgrounds/$clean';
    if (newPath == _assetPath) return;
    _assetPath = newPath;
    _asset = AssetImage(_assetPath);
    // Invalidate cache so next getOrCreate rebuilds with the new asset
    _provider = null;
    _cacheWidth = null;
    // Notify any UI listening to rebuild immediately
    revision.value++;
  }

  static void resetToDefault() {
    setByFilename(_defaultFilename);
  }

  static String get currentFilename => _assetPath.split('/').last;

  static String get currentAssetPath => _assetPath;

  static ImageProvider getOrCreate(BuildContext context) {
    final media = MediaQuery.of(context);
    final pxWidth = (media.size.width * media.devicePixelRatio).round();
    if (_provider == null || _cacheWidth != pxWidth) {
      _cacheWidth = pxWidth;
      _provider = ResizeImage(_asset, width: pxWidth);
    }
    return _provider!;
  }

  static Future<void> precache(BuildContext context) async {
    final img = getOrCreate(context);
    await precacheImage(img, context);
  }
}
