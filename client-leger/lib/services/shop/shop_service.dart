import 'dart:convert';

import 'package:client_leger/services/authentification/auth.dart';
import 'package:client_leger/models/shop/shop_items.dart';
import 'package:http/http.dart' as http;

class ShopService {
  final AuthService auth;
  final http.Client httpClient;
  final String serverBaseUrl;

  ShopService({
    required this.auth,
    required this.httpClient,
    required this.serverBaseUrl,
  });

  String _resolveAssetUrl(String path) {
    var p = path.trim();
    if (p.startsWith('./')) p = p.substring(2);
    if (p.startsWith('/')) p = p.substring(1);
    return '$serverBaseUrl/$p';
  }

  Future<List<ShopAvatarItem>> getAvailableAvatars() async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.get(
      Uri.parse('$serverBaseUrl/api/user/avatars/available'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (resp.statusCode != 200) {
      throw Exception('Failed to load avatars: ${resp.statusCode}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (body['availableAvatars'] as List<dynamic>? ?? []);
    return list.map((e) {
      final m = e as Map<String, dynamic>;
      return ShopAvatarItem(
        id: (m['id'] as num?)?.toInt() ?? -1,
        name: (m['name'] as String?) ?? '',
        imageUrl: _resolveAssetUrl((m['src'] as String?) ?? ''),
        price: (m['price'] as num?)?.toInt() ?? 0,
        title: (m['title'] as String?) ?? '',
        isTaken: m['isTaken'] as bool?,
      );
    }).toList();
  }

  Future<List<String>> getOwnedAvatarUrls() async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.get(
      Uri.parse('$serverBaseUrl/api/user/avatars/owned'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (resp.statusCode != 200) {
      throw Exception('Failed to load owned avatars: ${resp.statusCode}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (body['ownedPurchasableAvatars'] as List<dynamic>? ?? []);
    return list
        .map((e) => (e as String?)?.trim() ?? '')
        .where((s) => s.isNotEmpty)
        .toList();
  }

  Future<List<String>> purchaseAvatarByFilename(
    String filename,
    int price,
  ) async {
    final token = await auth.getToken(forceRefresh: false);
    final avatarURL = './assets/images/characters/$filename';

    final resp = await httpClient.post(
      Uri.parse('$serverBaseUrl/api/user/avatars/purchase'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'avatarURL': avatarURL, 'price': price}),
    );

    if (resp.statusCode != 200 && resp.statusCode != 201) {
      // Try to surface server error message
      try {
        final body = jsonDecode(resp.body);
        final msg = body is Map<String, dynamic>
            ? (body['message'] ?? resp.body).toString()
            : resp.body.toString();
        throw Exception(msg);
      } catch (_) {
        throw Exception('Failed to purchase avatar: ${resp.statusCode}');
      }
    }

    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (data['ownedPurchasableAvatars'] as List<dynamic>? ?? []);
    return list
        .map((e) => (e as String?)?.trim() ?? '')
        .where((s) => s.isNotEmpty)
        .map((s) => s.split('/').last.trim())
        .toList();
  }

  Future<List<ShopBackgroundItem>> getAvailableBackgrounds() async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.get(
      Uri.parse('$serverBaseUrl/api/user/backgrounds/available'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (resp.statusCode != 200) {
      throw Exception('Failed to load backgrounds: ${resp.statusCode}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (body['availableBackgrounds'] as List<dynamic>? ?? []);
    return list.map((e) {
      final m = e as Map<String, dynamic>;
      return ShopBackgroundItem(
        imageUrl: _resolveAssetUrl((m['url'] as String?) ?? ''),
        price: (m['price'] as num?)?.toInt() ?? 0,
        title: (m['title'] as String?) ?? '',
      );
    }).toList();
  }

  Future<List<ShopThemeItem>> getAvailableThemes() async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.get(
      Uri.parse('$serverBaseUrl/api/user/themes/available'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (resp.statusCode != 200) {
      throw Exception('Failed to load themes: ${resp.statusCode}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (body['availableThemes'] as List<dynamic>? ?? []);
    return list.map((e) {
      final m = e as Map<String, dynamic>;
      return ShopThemeItem(
        id: (m['id'] as num?)?.toInt() ?? -1,
        label: (m['label'] as String?) ?? '',
        price: (m['price'] as num?)?.toInt() ?? 0,
        owned: (m['owned'] as bool?) ?? false,
        colorClass: m['colorClass'] as String?,
      );
    }).toList();
  }

  // Returns the user's owned backgrounds as filenames (e.g., "title_page_bgd16.jpg").
  Future<List<String>> getOwnedBackgroundFilenames() async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.get(
      Uri.parse('$serverBaseUrl/api/user/backgrounds/owned'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (resp.statusCode != 200) {
      throw Exception('Failed to load owned backgrounds: ${resp.statusCode}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (body['ownedBackgrounds'] as List<dynamic>? ?? []);
    return list
        .map((e) => (e as String?)?.trim() ?? '')
        .where((s) => s.isNotEmpty)
        .map((s) => s.split('/').last.trim())
        .toList();
  }

  Future<List<String>> purchaseBackgroundByFilename(
    String filename,
    int price,
  ) async {
    final token = await auth.getToken(forceRefresh: false);
    final backgroundURL = './assets/images/backgrounds/$filename';

    final resp = await httpClient.post(
      Uri.parse('$serverBaseUrl/api/user/backgrounds/purchase'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'backgroundURL': backgroundURL, 'price': price}),
    );

    if (resp.statusCode != 200 && resp.statusCode != 201) {
      // Try to surface server error message
      try {
        final body = jsonDecode(resp.body);
        final msg = body is Map<String, dynamic>
            ? (body['message'] ?? resp.body).toString()
            : resp.body.toString();
        throw Exception(msg);
      } catch (_) {
        throw Exception('Failed to purchase background: ${resp.statusCode}');
      }
    }

    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (data['ownedBackgrounds'] as List<dynamic>? ?? []);
    return list
        .map((e) => (e as String?)?.trim() ?? '')
        .where((s) => s.isNotEmpty)
        .map((s) => s.split('/').last.trim())
        .toList();
  }

  Future<void> selectBackgroundByFilename(String filename) async {
    final token = await auth.getToken(forceRefresh: false);
    final backgroundURL = './assets/images/backgrounds/$filename';

    final resp = await httpClient.post(
      Uri.parse('$serverBaseUrl/api/user/backgrounds/select'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'backgroundURL': backgroundURL}),
    );

    if (resp.statusCode != 200 && resp.statusCode != 201) {
      try {
        final body = jsonDecode(resp.body);
        final msg = body is Map<String, dynamic>
            ? (body['message'] ?? resp.body).toString()
            : resp.body.toString();
        throw Exception(msg);
      } catch (_) {
        throw Exception('Failed to select background: ${resp.statusCode}');
      }
    }
  }

  Future<List<String>> getOwnedThemes() async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.get(
      Uri.parse('$serverBaseUrl/api/user/themes/owned'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (resp.statusCode != 200) {
      throw Exception('Failed to load owned themes: ${resp.statusCode}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (body['ownedThemes'] as List<dynamic>? ?? []);
    return list
        .map((e) => (e as String?)?.trim() ?? '')
        .where((s) => s.isNotEmpty)
        .toList();
  }

  Future<String?> getSelectedTheme() async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.get(
      Uri.parse('$serverBaseUrl/api/user/themes/selected'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (resp.statusCode != 200) return null;
    final body = jsonDecode(resp.body);
    if (body is! Map<String, dynamic>) return null;
    final name = (body['selectedTheme'] as String?)?.trim();
    return (name != null && name.isNotEmpty) ? name : null;
  }

  Future<void> selectTheme(String themeName) async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.post(
      Uri.parse('$serverBaseUrl/api/user/themes/select'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'theme': themeName}),
    );

    if (resp.statusCode != 200 && resp.statusCode != 201) {
      try {
        final body = jsonDecode(resp.body);
        final msg = body is Map<String, dynamic>
            ? (body['message'] ?? resp.body).toString()
            : resp.body.toString();
        throw Exception(msg);
      } catch (_) {
        throw Exception('Failed to select theme: ${resp.statusCode}');
      }
    }
  }

  Future<List<String>> purchaseTheme(String themeName, int price) async {
    final token = await auth.getToken(forceRefresh: false);
    final resp = await httpClient.post(
      Uri.parse('$serverBaseUrl/api/user/themes/purchase'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'theme': themeName, 'price': price}),
    );

    if (resp.statusCode != 200 && resp.statusCode != 201) {
      try {
        final body = jsonDecode(resp.body);
        final msg = body is Map<String, dynamic>
            ? (body['message'] ?? resp.body).toString()
            : resp.body.toString();
        throw Exception(msg);
      } catch (_) {
        throw Exception('Failed to purchase theme: ${resp.statusCode}');
      }
    }

    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    final list = (data['ownedThemes'] as List<dynamic>? ?? []);
    return list
        .map((e) => (e as String?)?.trim() ?? '')
        .where((s) => s.isNotEmpty)
        .toList();
  }

    Future<String?> getSelectedLanguage() async {
    try {
      final token = await auth.getToken(forceRefresh: false);
      final response = await http.get(
        Uri.parse('$serverBaseUrl/api/user/language/selected'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['selectedLanguage'] as String?;
      } else {
        throw Exception('Failed to get selected language: ${response.statusCode}');
      }
    } catch (e) {
      print('Error getting selected language: $e');
      rethrow;
    }
  }

  // Set selected language on server
  Future<void> setSelectedLanguage(String language) async {
    try {
      final token = await auth.getToken(forceRefresh: false);
      final response = await http.post(
        Uri.parse('$serverBaseUrl/api/user/language/select'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'language': language}),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('Failed to set language: ${response.statusCode}');
      }
    } catch (e) {
      print('Error setting selected language: $e');
      rethrow;
    }
  }
}
