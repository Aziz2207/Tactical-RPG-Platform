import 'dart:convert';
import 'dart:async';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class UserAccountService {
  final AuthService authService;
  final http.Client httpClient;
  final String serverBaseUrl;

  final ValueNotifier<Map<String, dynamic>?> accountDetails = ValueNotifier(
    null,
  );

  UserAccountService({
    required this.authService,
    required this.httpClient,
    required this.serverBaseUrl,
  }) {
    // Listen to Firebase user changes and fetch infos when connected.
    authService.currentUser.addListener(() {
      final u = authService.currentUser.value;
      if (u != null) {
        fetchAccountDetails();
      } else {
        accountDetails.value = null;
      }
    });
  }

  Future<bool> isUserConnected() => authService.isUserConnected();

  Future<void> fetchAccountDetails() async {
    try {
      final token = await authService.getToken(forceRefresh: false);

      final response = await httpClient.get(
        Uri.parse('$serverBaseUrl/api/user/signin'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final serverUser = (data['user'] as Map<String, dynamic>?) ?? {};

        try {
          final profile = await authService.getCurrentUserProfile();
          final enriched = <String, dynamic>{
            ...serverUser,
            if ((serverUser['email'] as String?) == null ||
                (serverUser['email'] as String?)!.trim().isEmpty)
              'email': profile?.email,
            if ((serverUser['username'] as String?) == null ||
                (serverUser['username'] as String?)!.trim().isEmpty)
              'username': profile?.username,
          }..removeWhere((k, v) => v == null);
          accountDetails.value = enriched;
        } catch (_) {
          // If profile fetch fails, keep server data as-is
          accountDetails.value = serverUser;
        }

        unawaited(_applySelectedThemeFromServer());
      } else {
        throw Exception('${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> signOut() async {
    try {
      final token = await authService.getToken(forceRefresh: false);

      final resp = await httpClient.post(
        Uri.parse('$serverBaseUrl/api/user/signout'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (resp.statusCode != 200 &&
          resp.statusCode != 201 &&
          resp.statusCode != 204) {
        throw Exception(
          'Signout failed with status ${resp.statusCode}: ${resp.body}',
        );
      }

      await authService.signOut();
      SocketService.I.disconnect();
      accountDetails.value = null;
    } catch (e) {
      rethrow;
    }
  }

  // Email/password direct via Firebase (puis fetch /user/infos)
  Future<void> signIn(String username, String password) async {
    await authService.signInWithEmailAndPassword(username, password);
    await fetchAccountDetails();
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String username,
    required String avatarURL,
  }) async {
    final resp = await httpClient.post(
      Uri.parse('$serverBaseUrl/api/user/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'username': username,
        'avatarURL': avatarURL,
      }),
    );

    if (resp.statusCode != 200 &&
        resp.statusCode != 201 &&
        resp.statusCode != 204) {
      try {
        final body = jsonDecode(resp.body);
        final msg = body is Map<String, dynamic>
            ? (body['message'] ?? resp.body)
            : resp.body.toString();
        throw Exception(msg);
      } catch (_) {
        throw Exception(resp.body.toString());
      }
    }

    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    final token = data['token'] as String;
    await authService.signInWithCustomToken(token);
  }

  /// Fetches the current user's currency balance from the backend.
  /// Returns the balance as an integer and updates [accountDetails] if present.
  Future<int> getBalance() async {
    final token = await authService.getToken(forceRefresh: false);
    final response = await httpClient.get(
      Uri.parse('$serverBaseUrl/api/user/balance'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final balance = (data['balance'] as num?)?.toInt() ?? 0;

      // Update the accountDetails map immutably if it exists
      final current = accountDetails.value;
      if (current != null) {
        accountDetails.value = {...current, 'balance': balance};
      }

      return balance;
    }

    // Try to surface server message if any
    try {
      final err = jsonDecode(response.body);
      throw Exception(
        err is Map<String, dynamic>
            ? (err['message'] ?? err).toString()
            : response.body,
      );
    } catch (_) {
      throw Exception('Failed to fetch balance (${response.statusCode})');
    }
  }

  Future<void> updateAvatar(String avatarURL) async {
    // Delegate to the generalized updater to ensure consistent behavior
    return updateUserAccount(avatarURL: avatarURL);
  }

  /// Any provided field (email, username, avatarURL) will be sent; missing
  /// fields are filled from current account details to satisfy server contract.
  Future<void> updateUserAccount({
    String? email,
    String? username,
    String? avatarURL,
  }) async {
    Map<String, dynamic>? current = accountDetails.value;
    if (current == null) {
      try {
        await fetchAccountDetails();
        current = accountDetails.value;
      } catch (e) {
        throw Exception('Impossible de charger les informations du compte: $e');
      }
    }

    if (current == null) {
      throw Exception('Informations du compte indisponibles');
    }

    final body = <String, dynamic>{
      'email': email ?? (current['email'] as String? ?? ''),
      'username': username ?? (current['username'] as String? ?? ''),
      'avatarURL': avatarURL ?? (current['avatarURL'] as String? ?? ''),
    };

    final token = await authService.getToken(forceRefresh: false);
    final resp = await httpClient.patch(
      Uri.parse('$serverBaseUrl/api/user'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );

    if (resp.statusCode != 200) {
      try {
        final err = jsonDecode(resp.body);
        final msg = err is Map<String, dynamic>
            ? (err['message'] ?? resp.body).toString()
            : resp.body.toString();
        throw Exception(msg);
      } catch (_) {
        throw Exception('Mise à jour du compte échouée (${resp.statusCode})');
      }
    }

    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    final updatedUser =
        (data['user'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final newToken = (data['token'] as String?)?.trim();

    if (newToken != null && newToken.isNotEmpty) {
      await authService.signInWithCustomToken(newToken);
      try {
        await fetchAccountDetails();
      } catch (_) {}
    }

    final curr = accountDetails.value ?? <String, dynamic>{};
    accountDetails.value = {...curr, ...updatedUser};
  }

  Future<void> deleteUserAccount() async {
    try {
      final token = await authService.getToken(forceRefresh: false);

      final resp = await httpClient.delete(
        Uri.parse('$serverBaseUrl/api/user/'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (resp.statusCode != 200 &&
          resp.statusCode != 201 &&
          resp.statusCode != 204) {
        try {
          final err = jsonDecode(resp.body);
          final msg = err is Map<String, dynamic>
              ? (err['message'] ?? resp.body).toString()
              : resp.body.toString();
          throw Exception(msg);
        } catch (_) {
          throw Exception('${resp.statusCode}');
        }
      }

      // Local cleanup
      await authService.signOut();
      SocketService.I.disconnect();
      accountDetails.value = null;
    } catch (e) {
      rethrow;
    }
  }

  // Fetches the user's currently selected theme from the backend and applies it
  // locally via ThemeConfig. Non-fatal: failures are ignored.
  Future<void> _applySelectedThemeFromServer() async {
    try {
      final token = await authService.getToken(forceRefresh: false);
      final resp = await httpClient.get(
        Uri.parse('$serverBaseUrl/api/user/themes/selected'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (resp.statusCode != 200) return; // silently ignore

      final body = jsonDecode(resp.body);
      if (body is! Map<String, dynamic>) return;
      final themeName = (body['selectedTheme'] as String?)?.trim();
      if (themeName == null || themeName.isEmpty) return;

      // Only apply if it's a known theme to avoid exceptions
      final names = ThemeConfig.availableThemeNames;
      final normalized = themeName.toLowerCase();
      final match = names.firstWhere(
        (n) => n.toLowerCase() == normalized,
        orElse: () => '',
      );
      if (match.isNotEmpty) {
        ThemeConfig.setPaletteByName(match);
      }
    } catch (_) {
      // ignore any error; keep current theme
    }
  }

  void adjustBalance(int delta, {bool addToLifetimeEarnings = false}) {
    final current = accountDetails.value;
    if (current == null) {
      if (kDebugMode) {
        print('Cannot adjust balance: account details not loaded');
      }
      return;
    }

    final currentBalance = (current['balance'] as num?)?.toInt() ?? 0;
    final newBalance = currentBalance + delta;

    updateBalance(newBalance, addToLifetimeEarnings: addToLifetimeEarnings);
  }

  void updateBalance(int amount, {bool addToLifetimeEarnings = false}) {
    if (!SocketService.I.isConnected) {
      if (kDebugMode) {
        print('Socket not connected, cannot update balance');
      }
      return;
    }

    SocketService.I.emit('updateUserBalance', {
      'amount': amount,
      'addToLifetimeEarnings': addToLifetimeEarnings,
    });

    // Optimistically update local balance
    final current = accountDetails.value;
    if (current != null) {
      accountDetails.value = {...current, 'balance': amount};
    }
  }
}
