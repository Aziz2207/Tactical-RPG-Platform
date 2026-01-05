import 'package:client_leger/utils/constants/assets/assets.dart';
import 'package:client_leger/services/friends/friends-service.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/widgets/friends/user-card.dart';
import 'package:client_leger/widgets/friends/friends-request-dialog.dart';
import 'package:client_leger/widgets/friends/user-search-page.dart';
import 'package:client_leger/widgets/friends/friend_request_badge.dart';
import 'package:client_leger/widgets/friends/friends_action_button.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:client_leger/widgets/friends/blocked_users_page.dart';
import 'package:easy_localization/easy_localization.dart';

class FriendsChannel extends StatefulWidget {
  const FriendsChannel({super.key, this.onClose});
  final VoidCallback? onClose;

  @override
  State<FriendsChannel> createState() => FriendsChannelState();
}

class FriendsChannelState extends State<FriendsChannel> {
  int? nFriendRequest;

  final FriendService _friend = FriendService();
  bool _listenersBound = false;
  // Removed gold pill actions; no pressed state needed anymore.
  List<Map<String, dynamic>> _friends = [];
  bool _friendsLoading = true;
  Timer? _friendRequestsRefreshTimer;
  final Map<String, bool> _friendStatuses = {};

  // When we check if any requests are received, add a debounce so we don't get in race conditions.
  void _scheduleFriendRequestsRefresh({
    Duration delay = const Duration(milliseconds: 500),
  }) {
    _friendRequestsRefreshTimer?.cancel();
    _friendRequestsRefreshTimer = Timer(delay, () {
      _friend.getFriendRequests();
    });
  }

  Future<bool> _confirmRemoveFriend(String username) async {
    if (!mounted) return false;
    return AppDialogs.showConfirm(
      context: context,
      title: 'FRIENDS.REMOVE_FRIEND_TITLE'.tr(),
      message: 'FRIENDS.REMOVE_FRIEND_MESSAGE'.tr(
        namedArgs: {'username': username},
      ),
    );
  }

  Future<bool> _confirmBlockUser(String username) async {
    if (!mounted) return false;
    return AppDialogs.showConfirm(
      context: context,
      title: 'FRIENDS.BLOCK_USER_TITLE'.tr(),
      message: 'FRIENDS.BLOCK_USER_MESSAGE_FRIEND'.tr(
        namedArgs: {'username': username},
      ),
    );
  }

  @override
  void initState() {
    super.initState();

    if (!_listenersBound) _bindSocketListeners();
    _friend.bindPresenceListeners();

    _friend.socket.connect().then((_) async {
      await Future.delayed(
        const Duration(milliseconds: 100),
      ); // Allow socket to fully initialize
      _friend.getFriendRequests();
      _friend.getFriends();
      // getOnlineFriends() will be called automatically after friends list is received
    });

    _friend.socket.on('connect', (_) {
      _friend.getFriendRequests();
      _friend.getFriends();
      // getOnlineFriends() will be called automatically after friends list is received
    });
  }

  void _bindSocketListeners() {
    if (_listenersBound) return;
    _listenersBound = true;

    // Receive the full list of pending friend requests
    _friend.socket.on('friendRequests', (data) {
      if (!mounted) return;
      try {
        final list = List.from(data);
        setState(() {
          nFriendRequest = list.length;
        });
      } catch (_) {
        setState(() {
          nFriendRequest = 0;
        });
      }
    });

    // When a new request is received in real-time, refresh the list
    _friend.socket.on('friendRequestReceived', (_) {
      if (!mounted) return;
      setState(() {
        final current = nFriendRequest ?? 0;
        nFriendRequest = current + 1;
      });
      _scheduleFriendRequestsRefresh();
    });

    // When a request is accepted or rejected, refresh the list
    _friend.socket.on('friendRequestAccepted', (_) {
      if (!mounted) return;
      setState(() {
        final current = nFriendRequest ?? 0;
        nFriendRequest = current > 0 ? current - 1 : 0;
      });
      _scheduleFriendRequestsRefresh();
      _friend.getFriends();
    });
    _friend.socket.on('friendRequestAcceptedByUser', (_) {
      if (!mounted) return;
      setState(() {
        final current = nFriendRequest ?? 0;
        nFriendRequest = current > 0 ? current - 1 : 0;
      });
      _scheduleFriendRequestsRefresh();
      _friend.getFriends();
    });
    _friend.socket.on('friendRequestRejected', (_) {
      if (!mounted) return;
      setState(() {
        final current = nFriendRequest ?? 0;
        nFriendRequest = current > 0 ? current - 1 : 0;
      });
      _scheduleFriendRequestsRefresh();
    });
    _friend.socket.on('friendRequestRejectedByUser', (_) {
      if (!mounted) return;
      setState(() {
        final current = nFriendRequest ?? 0;
        nFriendRequest = current > 0 ? current - 1 : 0;
      });
      _scheduleFriendRequestsRefresh();
    });

    _friend.socket.on('friendRequestSent', (_) {
      _scheduleFriendRequestsRefresh();
    });

    // Receive full list of current friends
    _friend.socket.on('friends', (data) {
      if (!mounted) return;
      try {
        final list = List<Map<String, dynamic>>.from(
          (data as List).map((e) => Map<String, dynamic>.from(e)),
        );
        setState(() {
          _friends = list;
          _friendsLoading = false;
        });
        if (FriendService.onlineStatuses.isNotEmpty) {
          _applyOnlineStatusMap(FriendService.onlineStatuses);
        }
        _prefetchFriendAvatars(list);
        _friend.getOnlineFriends();
      } catch (_) {
        setState(() {
          _friends = [];
          _friendsLoading = false;
        });
      }
    });

    // When the server notifies updates, update our list directly
    _friend.socket.on('friendsUpdated', (data) {
      if (!mounted) return;
      try {
        final list = List<Map<String, dynamic>>.from(
          (data as List).map((e) => Map<String, dynamic>.from(e)),
        );
        setState(() {
          _friends = list;
          _friendsLoading = false;
        });
        _applyOnlineStatusMap(_friendStatuses);
        _prefetchFriendAvatars(list);
        _friend.getOnlineFriends();
      } catch (_) {
        setState(() {
          _friends = [];
          _friendsLoading = false;
        });
      }
    });

    _friend.socket.on('onlineFriends', (data) {
      if (!mounted) return;
      try {
        final map = Map<String, dynamic>.from(data as Map);
        _applyOnlineStatusMap(map);
        map.forEach((k, v) => FriendService.onlineStatuses[k] = v == true);
      } catch (_) {}
    });

    _friend.socket.on('userConnected', (data) {
      if (!mounted) return;
      final String? uid = _extractUid(data);
      if (uid != null && uid.isNotEmpty) {
        _updateFriendOnlineStatus(uid, true);
        FriendService.onlineStatuses[uid] = true;
      }
    });
    _friend.socket.on('userDisconnected', (data) {
      if (!mounted) return;
      final String? uid = _extractUid(data);
      if (uid != null && uid.isNotEmpty) {
        _updateFriendOnlineStatus(uid, false);
        FriendService.onlineStatuses[uid] = false;
      }
    });

    // If a friend is removed (by us or by them), refresh from server
    _friend.socket.on('friendRemoved', (_) {
      _friend.getFriends();
    });
    _friend.socket.on('removedAsFriend', (_) {
      _friend.getFriends();
    });

    _friend.socket.on('userBlocked', (_) {
      _friend.getFriends();
    });
    _friend.socket.on('userUnblocked', (_) {
      _friend.getFriends();
    });

    _friend.socket.on('errorMessage', (msg) {
      if (!mounted) return;
      final text = msg?.toString() ?? '';
      if (text.toLowerCase().contains("demandes d'ami")) {
        _showErrorSnackBar(text);
      }
    });
  }

  void _prefetchFriendAvatars(
    List<Map<String, dynamic>> list, {
    int limit = 50,
  }) {
    if (!mounted) return;
    final ctx = context;
    int count = 0;
    for (final f in list) {
      if (count >= limit) break;
      final url = (f['avatarURL'] ?? '').toString().trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        precacheImage(CachedNetworkImageProvider(url), ctx);
        count++;
      }
    }
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

  String? _extractUid(dynamic data) {
    try {
      if (data is Map) {
        final m = Map<String, dynamic>.from(data);
        final v = m['uid'];
        if (v is String) return v;
      }
      if (data is String) return data;
    } catch (_) {}
    return null;
  }

  void _applyOnlineStatusMap(Map<String, dynamic> map) {
    if (!mounted) return;
    setState(() {
      map.forEach((key, value) {
        final bool isOnline = value == true;
        _friendStatuses[key] = isOnline;
        FriendService.onlineStatuses[key] = isOnline;
      });
      // update current list
      _friends = _friends
          .map((f) {
            final uid = (f['uid'] ?? '').toString();
            if (uid.isEmpty) return f;
            final online = _friendStatuses[uid];
            if (online == null) return f;
            final updated = Map<String, dynamic>.from(f);
            updated['isConnected'] = online;
            return updated;
          })
          .toList(growable: false);
    });
  }

  // Helper: update a single friend's online status
  void _updateFriendOnlineStatus(String uid, bool isOnline) {
    if (!mounted) return;
    setState(() {
      _friendStatuses[uid] = isOnline;
      FriendService.onlineStatuses[uid] = isOnline;
      for (var i = 0; i < _friends.length; i++) {
        final f = _friends[i];
        if ((f['uid'] ?? '').toString() == uid) {
          final updated = Map<String, dynamic>.from(f);
          updated['isConnected'] = isOnline;
          _friends[i] = updated;
          break;
        }
      }
    });
  }

  void _openFriendRequests() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => FriendsRequestDialog()));
  }

  void _openUserSearch() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const UserSearchPage()));
  }

  void _openBlockedUsers() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const BlockedUsersPage()));
  }

  void _handleClosePressed() {
    FocusScope.of(context).unfocus();
    if (widget.onClose != null) {
      widget.onClose!();
    } else if (context.mounted) {
      Navigator.of(context).pop();
    }
  }

  Future<void> _onRemoveFriend({
    required int index,
    required String uid,
    required String username,
  }) async {
    if (uid.isEmpty) return;
    final confirmed = await _confirmRemoveFriend(username);
    if (!confirmed) return;
    if (!mounted) return;
    _friend.removeFriend(uid);
  }

  @override
  void dispose() {
    _friend.socket.off('friendRequests');
    _friend.socket.off('friendRequestReceived');
    _friend.socket.off('friendRequestAccepted');
    _friend.socket.off('friendRequestAcceptedByUser');
    _friend.socket.off('friendRequestRejected');
    _friend.socket.off('friendRequestRejectedByUser');
    _friend.socket.off('friendRequestSent');
    _friend.socket.off('errorMessage');
    _friend.socket.off('friends');
    _friend.socket.off('friendsUpdated');
    _friend.socket.off('friendRemoved');
    _friend.socket.off('removedAsFriend');
    _friend.socket.off('userBlocked');
    _friend.socket.off('userUnblocked');
    _friend.socket.off('onlineFriends');
    _friend.socket.off('userConnected');
    _friend.socket.off('userDisconnected');
    _friend.socket.off('connect');
    _friendRequestsRefreshTimer?.cancel();
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
            title: Text(
              'FRIENDS.TITLE'.tr(),
              style: TextStyle(
                color: palette.mainTextColor,
                fontFamily: FontFamily.PAPYRUS,
                fontWeight: FontWeight.bold,
              ),
            ),
            actions: [
              IconButton(
                icon: Icon(Icons.close, color: palette.mainTextColor),
                onPressed: _handleClosePressed,
              ),
            ],
            iconTheme: IconThemeData(color: palette.mainTextColor),
            elevation: 0,
          ),
          body: Container(
            color: flatBg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 16, left: 16, right: 16),
                  child: Column(
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          FriendsActionButton(
                            label: 'FRIENDS.FRIEND_REQUEST'.tr(),
                            isPressed: false,
                            onTap: _openFriendRequests,
                            onHighlightChanged: (_) {},
                            width: double.infinity,
                            fontSize: 24,
                          ),
                          Positioned(
                            right: 6,
                            top: -8,
                            child: FriendRequestBadge(count: nFriendRequest),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      FriendsActionButton(
                        label: '${'FRIENDS.SEARCH'.tr()}  🔍',
                        isPressed: false,
                        onTap: _openUserSearch,
                        onHighlightChanged: (_) {},
                        width: double.infinity,
                        fontSize: 22,
                      ),
                      const SizedBox(height: 12),
                      FriendsActionButton(
                        label: 'FRIENDS.BLOCKED_USERS'.tr(),
                        isPressed: false,
                        onTap: _openBlockedUsers,
                        onHighlightChanged: (_) {},
                        width: double.infinity,
                        fontSize: 22,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.only(top: 24, left: 24, right: 24),
                  child: Text(
                    'FRIENDS.LIST'.tr(),
                    style: const TextStyle(
                      color: Colors.white70,
                      fontFamily: FontFamily.PAPYRUS,
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                    ),
                  ),
                ),
                Expanded(
                  child: _friendsLoading
                      ? const Center(
                          child: CircularProgressIndicator(
                            color: Colors.white70,
                          ),
                        )
                      : (_friends.isEmpty)
                      ? Center(
                          child: Text(
                            'FRIENDS.NO_FRIENDS'.tr(),
                            style: const TextStyle(
                              color: Colors.white54,
                              fontFamily: FontFamily.PAPYRUS,
                            ),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 12,
                          ),
                          itemCount: _friends.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 6),
                          itemBuilder: (context, index) {
                            final f = _friends[index];
                            final username =
                                (f['username'] ?? 'FRIENDS.NO_FRIENDS'.tr())
                                    .toString();
                            final avatarUrl =
                                (f['avatarURL'] ?? AppAssets.characters[0])
                                    .toString();
                            final isConnected =
                                (f['isConnected'] ?? false) == true;
                            return Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                              ),
                              child: UserCard(
                                username: username,
                                avatarUrl: avatarUrl,
                                isConnected: isConnected,
                                onRemoveFriend: () {
                                  final uid = (f['uid'] ?? '').toString();
                                  _onRemoveFriend(
                                    index: index,
                                    uid: uid,
                                    username: username,
                                  );
                                },
                                onBlock: () async {
                                  final uid = (f['uid'] ?? '').toString();
                                  if (uid.isEmpty) return;
                                  final confirmed = await _confirmBlockUser(
                                    username,
                                  );
                                  if (!confirmed) return;
                                  if (!mounted) return;
                                  _friend.blockUser(uid);
                                },
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
