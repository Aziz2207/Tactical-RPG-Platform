import 'package:client_leger/services/friends/friends-service.dart';
import 'package:client_leger/utils/constants/assets/assets.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/widgets/friends/user-card.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:easy_localization/easy_localization.dart';

class UserSearchPage extends StatefulWidget {
  const UserSearchPage({super.key});
  @override
  State<UserSearchPage> createState() => _UserSearchPageState();
}

class _UserSearchPageState extends State<UserSearchPage> {
  List<Map<String, dynamic>> allUsers = [];
  List<Map<String, dynamic>> users = [];
  final FriendService friend = FriendService();
  final TextEditingController searchController = TextEditingController();

  bool _listenersBound = false;
  Timer? _pollTimer;
  Set<String> _friendIds = <String>{};
  String _selfUid = '';

  final GlobalKey<ScaffoldMessengerState> _messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  // Keep references to our own socket handlers so we can remove only ours
  void Function(dynamic)? _onConnect;
  void Function(dynamic)? _onAllUsers;
  void Function(dynamic)? _onFriends;
  void Function(dynamic)? _onFriendsUpdated;
  void Function(dynamic)? _onFriendRequestSent;
  void Function(dynamic)? _onErrorMessage;

  @override
  void initState() {
    super.initState();
    _selfUid = FirebaseAuth.instance.currentUser?.uid ?? '';

    // Connect and bind listeners once the socket is ready
    friend.socket.connect().then((_) {
      if (!_listenersBound) _bindSocketListeners();
      // Fetch users immediately after first connect
      friend.socket.emit("getAllUsers");
      friend.getFriends();
      _startPolling();
    });

    // On subsequent reconnects, just re-fetch users
    _onConnect = (_) {
      friend.socket.emit("getAllUsers");
      friend.getFriends();
      _startPolling();
    };
    friend.socket.on("connect", _onConnect!);
  }

  void _bindSocketListeners() {
    if (_listenersBound) return;
    _listenersBound = true;

    _onAllUsers = (data) {
      final fetched = List<Map<String, dynamic>>.from(data);
      if (!mounted) return;
      setState(() {
        allUsers = fetched;
        final q = searchController.text.trim();
        if (q.isEmpty) {
          users = fetched
              .where((u) => !_friendIds.contains((u['uid'] ?? '').toString()))
              .where((u) => (u['uid'] ?? '').toString() != _selfUid)
              .toList();
        } else {
          users = fetched
              .where(
                (u) => (u["username"] ?? "")
                    .toString()
                    .toLowerCase()
                    .startsWith(q.toLowerCase()),
              )
              .where((u) => (u['uid'] ?? '').toString() != _selfUid)
              .toList();
        }
      });
    };
    friend.socket.on("allUsers", _onAllUsers!);

    // Keep friends list in sync to filter them out from search results
    _onFriends = (data) {
      if (!mounted) return;
      try {
        final list = List<Map<String, dynamic>>.from(
          (data as List).map((e) => Map<String, dynamic>.from(e)),
        );
        setState(() {
          _friendIds = list.map((e) => (e['uid'] ?? '').toString()).toSet();
          // Reapply current filter against updated friends set
          _filterUsers(searchController.text);
        });
      } catch (_) {}
    };
    friend.socket.on("friends", _onFriends!);

    _onFriendsUpdated = (data) {
      if (!mounted) return;
      try {
        final list = List<Map<String, dynamic>>.from(
          (data as List).map((e) => Map<String, dynamic>.from(e)),
        );
        setState(() {
          _friendIds = list.map((e) => (e['uid'] ?? '').toString()).toSet();
          _filterUsers(searchController.text);
        });
      } catch (_) {}
    };
    friend.socket.on("friendsUpdated", _onFriendsUpdated!);

    _onFriendRequestSent = (data) {
      if (!mounted) return;
      _showSnackBarSuccess('FRIENDS.FRIEND_REQUEST_SENT_MESSAGE'.tr());
    };
    friend.socket.on("friendRequestSent", _onFriendRequestSent!);

    // Centralized error channel from server
    _onErrorMessage = (data) {
      if (!mounted) return;
      final raw = data?.toString() ?? '';
      final msg = _mapFriendRequestError(raw);
      if (msg != null) {
        _showSnackBarError(msg);
      }
    };
    friend.socket.on("errorMessage", _onErrorMessage!);
  }

  void _showSnackBarSuccess(String message) {
    final palette = ThemeConfig.palette.value;
    _messengerKey.currentState?.hideCurrentSnackBar();
    _messengerKey.currentState?.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: palette.primary,
        content: Row(
          children: [
            Icon(Icons.check_circle, color: palette.invertedTextColor),
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

  void _showSnackBarError(String message) {
    final palette = ThemeConfig.palette.value;
    _messengerKey.currentState?.hideCurrentSnackBar();
    _messengerKey.currentState?.showSnackBar(
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

  String? _mapFriendRequestError(String serverMsg) {
    final lower = serverMsg.toLowerCase();

    final isFriendRequestContext =
        lower.contains("envoi de la demande d'ami") ||
        lower.contains("friend request");
    if (!isFriendRequestContext) return null;

    if (lower.contains("cannot send friend request to yourself")) {
      return "FRIENDS.ERRORS.CANNOT_SEND_TO_YOURSELF".tr();
    }
    if (lower.contains("sender not found")) {
      return "FRIENDS.ERRORS.SENDER_NOT_FOUND".tr();
    }
    if (lower.contains("receiver not found")) {
      return "FRIENDS.ERRORS.RECEIVER_NOT_FOUND".tr();
    }
    if (lower.contains("users are already friends")) {
      return "FRIENDS.ERRORS.ALREADY_FRIENDS".tr();
    }
    if (lower.contains("cannot send friend request to this user")) {
      return "FRIENDS.ERRORS.CANNOT_SEND_TO_USER".tr();
    }
    if (lower.contains("cannot send friend request to blocked user")) {
      return "FRIENDS.ERRORS.CANNOT_SEND_TO_BLOCKED".tr();
    }
    if (lower.contains("friend request already sent")) {
      return "FRIENDS.ERRORS.REQUEST_ALREADY_SENT".tr();
    }
    if (lower.contains("this user has already sent you a friend request")) {
      return "FRIENDS.ERRORS.USER_ALREADY_SENT_REQUEST".tr();
    }

    return "FRIENDS.ERRORS.CANNOT_SEND_REQUEST".tr();
  }

  void _filterUsers(String query) {
    final userSearch = query.trim().toLowerCase();
    setState(() {
      if (userSearch.isEmpty) {
        users = allUsers
            .where((u) => !_friendIds.contains((u['uid'] ?? '').toString()))
            .where((u) => (u['uid'] ?? '').toString() != _selfUid)
            .toList();
      } else {
        users = allUsers
            .where(
              (u) => (u["username"] ?? "").toLowerCase().startsWith(userSearch),
            )
            .where((u) => (u['uid'] ?? '').toString() != _selfUid)
            .toList();
      }
    });
  }

  Future<bool> _confirmBlock(String username) async {
    if (!mounted) return false;
    return AppDialogs.showConfirm(
      context: context,
      title: 'FRIENDS.BLOCK_USER_TITLE'.tr(),
      message: 'FRIENDS.BLOCK_USER_MESSAGE_OTHER'.tr(
        namedArgs: {'username': username},
      ),
    );
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      friend.socket.emit("getAllUsers");
    });
  }

  @override
  void dispose() {
    if (_onAllUsers != null) {
      friend.socket.offWithHandler("allUsers", _onAllUsers!);
    }
    if (_onFriendRequestSent != null) {
      friend.socket.offWithHandler("friendRequestSent", _onFriendRequestSent!);
    }
    if (_onErrorMessage != null) {
      friend.socket.offWithHandler("errorMessage", _onErrorMessage!);
    }
    if (_onConnect != null) {
      friend.socket.offWithHandler("connect", _onConnect!);
    }
    if (_onFriends != null) {
      friend.socket.offWithHandler("friends", _onFriends!);
    }
    if (_onFriendsUpdated != null) {
      friend.socket.offWithHandler("friendsUpdated", _onFriendsUpdated!);
    }
    _pollTimer?.cancel();
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final visibleUsers = users
        .where((u) => !_friendIds.contains((u['uid'] ?? '').toString()))
        .where((u) => (u['uid'] ?? '').toString() != _selfUid)
        .toList();

    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        final Color flatBg = Color.alphaBlend(
          palette.primary.withOpacity(0.08),
          palette.secondaryVeryDark.withOpacity(0.95),
        );
        return ClipRRect(
          borderRadius: BorderRadius.circular(15),
          child: ScaffoldMessenger(
            key: _messengerKey,
            child: Scaffold(
              backgroundColor: flatBg,
              appBar: AppBar(
                backgroundColor: palette.secondaryDark.withOpacity(0.95),
                elevation: 0,
                centerTitle: true,
                title: Text(
                  'FRIENDS.SEARCH_2'.tr(),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    fontFamily: FontFamily.PAPYRUS,
                    color: palette.mainTextColor,
                  ),
                ),
              ),
              body: SafeArea(
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 30,
                      ),
                      child: Center(
                        child: SizedBox(
                          width: 500,
                          child: TextField(
                            controller: searchController,
                            onChanged: _filterUsers,
                            maxLength: 20,
                            decoration: InputDecoration(
                              counterText: "",
                              hintText: 'FRIENDS.SEARCH'.tr(),
                              hintStyle: TextStyle(
                                color: palette.mainTextColor.withOpacity(0.7),
                                fontFamily: FontFamily.PAPYRUS,
                                fontWeight: FontWeight.bold,
                              ),
                              prefixIcon: Icon(
                                Icons.search,
                                color: palette.mainTextColor,
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 14,
                              ),
                              filled: true,
                              fillColor: palette.secondaryVeryDark,
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(30),
                                borderSide: BorderSide(
                                  color: palette.primary,
                                  width: 1.5,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(30),
                                borderSide: BorderSide(
                                  color: palette.primary,
                                  width: 2,
                                ),
                              ),
                            ),
                            style: TextStyle(
                              color: palette.mainTextColor,
                              fontFamily: FontFamily.PAPYRUS,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: visibleUsers.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.search_off,
                                    color: palette.mainTextColor.withOpacity(
                                      0.7,
                                    ),
                                    size: 36,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'FRIENDS.NO_FRIENDS'.tr(),
                                    style: TextStyle(
                                      color: palette.mainTextColor.withOpacity(
                                        0.7,
                                      ),
                                      fontFamily: FontFamily.PAPYRUS,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : LayoutBuilder(
                              builder: (context, constraints) {
                                int cols = 3;
                                return GridView.builder(
                                  padding: const EdgeInsets.all(10),
                                  gridDelegate:
                                      SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount: cols,
                                        crossAxisSpacing: 10,
                                        mainAxisSpacing: 10,
                                        childAspectRatio: 3.8,
                                      ),
                                  itemCount: visibleUsers.length,
                                  itemBuilder: (context, index) {
                                    final user = visibleUsers[index];
                                    return UserCard(
                                      username:
                                          user["username"] ??
                                          'FRIENDS.NO_FRIENDS'.tr(),
                                      avatarUrl:
                                          user["avatarURL"] ??
                                          AppAssets.characters[3],
                                      showConnectionStatus: false,
                                      onAddFriend: () {
                                        friend.sendFriendRequest(user["uid"]);
                                      },
                                      onBlock: () async {
                                        final uid = (user['uid'] ?? '')
                                            .toString();
                                        if (uid.isEmpty) return;
                                        final username =
                                            (user['username'] ??
                                                    'FRIENDS.NO_FRIENDS'.tr())
                                                .toString();
                                        final confirmed = await _confirmBlock(
                                          username,
                                        );
                                        if (!confirmed) return;
                                        if (!mounted) return;
                                        setState(() {
                                          users.removeWhere(
                                            (u) =>
                                                (u['uid'] ?? '').toString() ==
                                                uid,
                                          );
                                          allUsers.removeWhere(
                                            (u) =>
                                                (u['uid'] ?? '').toString() ==
                                                uid,
                                          );
                                        });
                                        friend.blockUser(uid);
                                        _showSnackBarSuccess(
                                          'FRIENDS.USER_BLOCKED_MESSAGE'.tr(
                                            namedArgs: {'username': username},
                                          ),
                                        );
                                      },
                                    );
                                  },
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
