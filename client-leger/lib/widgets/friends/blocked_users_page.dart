import 'dart:async';

import 'package:client_leger/services/friends/friends-service.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:client_leger/widgets/friends/user-card.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class BlockedUsersPage extends StatefulWidget {
  const BlockedUsersPage({super.key});

  @override
  State<BlockedUsersPage> createState() => _BlockedUsersPageState();
}

class _BlockedUsersPageState extends State<BlockedUsersPage> {
  final FriendService _friend = FriendService();
  bool _listenersBound = false;
  bool _loading = true;
  List<Map<String, dynamic>> _blockedUsers = [];
  Timer? _refreshDebounce;

  @override
  void initState() {
    super.initState();
    if (!_listenersBound) _bindSocketListeners();
    _friend.getBlockedUsers();
  }

  void _bindSocketListeners() {
    if (_listenersBound) return;
    _listenersBound = true;

    _friend.socket.on('blockedUsers', (data) {
      if (!mounted) return;
      try {
        final list = List<Map<String, dynamic>>.from(
          (data as List).map((e) => Map<String, dynamic>.from(e)),
        );
        setState(() {
          _blockedUsers = list;
          _loading = false;
        });
      } catch (_) {
        setState(() {
          _blockedUsers = [];
          _loading = false;
        });
      }
    });

    _friend.socket.on('userUnblocked', (_) {
      _scheduleRefresh();
    });
    _friend.socket.on('userBlocked', (_) {
      _scheduleRefresh();
    });

    _friend.socket.on('errorMessage', (msg) {
      if (!mounted) return;
      final text = msg?.toString() ?? '';
      if (text.toLowerCase().contains('bloqu')) {
        _showErrorSnackBar(text);
      }
    });
  }

  void _scheduleRefresh({Duration delay = const Duration(milliseconds: 400)}) {
    _refreshDebounce?.cancel();
    _refreshDebounce = Timer(delay, () {
      _friend.getBlockedUsers();
    });
  }

  void _showErrorSnackBar(String message) {
    final messenger = ScaffoldMessenger.of(context);
    final palette = ThemeConfig.palette.value;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: palette.primary,
          content: Row(
            children: [
              Icon(Icons.error_outline, color: palette.invertedTextColor),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  message,
                  style: TextStyle(
                    color: palette.invertedTextColor,
                    fontFamily: FontFamily.PAPYRUS,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          duration: const Duration(seconds: 2),
        ),
      );
  }

  Future<void> _onUnblock(Map<String, dynamic> user) async {
    final uid = (user['uid'] ?? '').toString();
    final username = (user['username'] ?? 'FRIENDS.NO_FRIENDS'.tr()).toString();
    if (uid.isEmpty) return;

    final confirmed = await AppDialogs.showConfirm(
      context: context,
      title: 'DIALOG.TITLE.UNBLOCK_USER'.tr(),
      message: 'DIALOG.MESSAGE.UNBLOCK_USER'.tr(
        namedArgs: {'username': username},
      ),
    );
    if (!confirmed) return;

    if (!mounted) return;
    setState(() {
      _blockedUsers.removeWhere((e) => (e['uid'] ?? '') == uid);
    });
    _friend.unblockUser(uid);
  }

  @override
  void dispose() {
    _friend.socket.off('blockedUsers');
    _friend.socket.off('userUnblocked');
    _friend.socket.off('userBlocked');
    _friend.socket.off('errorMessage');
    _refreshDebounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        final Color flatBg = Color.alphaBlend(
          palette.primary.withOpacity(0.08),
          palette.secondaryVeryDark.withOpacity(0.95),
        );
        return Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: palette.secondaryDark.withOpacity(0.95),
            iconTheme: IconThemeData(color: palette.mainTextColor),
            title: Text(
              'FRIENDS.BLOCKED_USERS'.tr(),
              style: TextStyle(
                color: palette.mainTextColor,
                fontFamily: FontFamily.PAPYRUS,
                fontWeight: FontWeight.bold,
              ),
            ),
            elevation: 0,
          ),
          body: Container(
            color: flatBg,
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: Colors.white70),
                  )
                : (_blockedUsers.isEmpty)
                ? Center(
                    child: Text(
                      'FRIENDS.NO_BLOCKED_USERS'.tr(),
                      style: const TextStyle(
                        color: Colors.white54,
                        fontFamily: FontFamily.PAPYRUS,
                      ),
                    ),
                  )
                : LayoutBuilder(
                    builder: (context, constraints) {
                      const int cols = 3;
                      return GridView.builder(
                        padding: const EdgeInsets.all(10),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: cols,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                              childAspectRatio: 3.8,
                            ),
                        itemCount: _blockedUsers.length,
                        itemBuilder: (context, index) {
                          final u = _blockedUsers[index];
                          final username =
                              (u['username'] ?? 'FRIENDS.NO_FRIENDS'.tr())
                                  .toString();
                          final avatarUrl = (u['avatarURL'] ?? '').toString();
                          return UserCard(
                            username: username,
                            avatarUrl: avatarUrl,
                            showConnectionStatus: false,
                            onUnblock: () => _onUnblock(u),
                          );
                        },
                      );
                    },
                  ),
          ),
        );
      },
    );
  }
}
