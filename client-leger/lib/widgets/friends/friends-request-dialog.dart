import 'package:client_leger/services/friends/friends-service.dart';
import 'package:client_leger/utils/constants/assets/assets.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/widgets/friends/user-card.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class FriendsRequestDialog extends StatefulWidget {
  @override
  State<FriendsRequestDialog> createState() => _FriendsRequestDialogState();
}

class _FriendsRequestDialogState extends State<FriendsRequestDialog> {
  final FriendService friendService = FriendService();
  final GlobalKey<ScaffoldMessengerState> _messengerKey =
      GlobalKey<ScaffoldMessengerState>();
  List<Map<String, dynamic>> friendRequests = [];
  bool _loading = true;
  bool _listenersBound = false;

  // Keep references to handlers so we can remove only ours in dispose
  void Function(dynamic)? _onFriendRequests;
  void Function(dynamic)? _onFriendRequestReceived;
  void Function(dynamic)? _onFriendRequestAcceptedByUser;
  void Function(dynamic)? _onFriendRequestRejectedByUser;
  void Function(dynamic)? _onFriendRequestAccepted;
  void Function(dynamic)? _onFriendRequestRejected;
  void Function(dynamic)? _onErrorMessage;

  void initState() {
    super.initState();
    _ensureConnectedAndLoad();
  }

  Future<void> _ensureConnectedAndLoad() async {
    await friendService.socket.connect();
    _bindListeners();
    await Future.delayed(const Duration(milliseconds: 100));
    friendService.getFriendRequests();
  }

  void _bindListeners() {
    if (_listenersBound) return;
    _listenersBound = true;

    // Get list of friend requests
    _onFriendRequests = (data) {
      if (!mounted) return;
      try {
        final list = List<Map<String, dynamic>>.from(
          (data as List).map((e) => Map<String, dynamic>.from(e)),
        );
        setState(() {
          friendRequests = list;
          _loading = false;
        });
      } catch (_) {
        setState(() {
          friendRequests = [];
          _loading = false;
        });
      }
    };
    friendService.socket.on('friendRequests', _onFriendRequests!);

    // When a request is received/accepted/rejected elsewhere, refresh
    _onFriendRequestReceived = (_) => friendService.getFriendRequests();
    _onFriendRequestAcceptedByUser = (_) => friendService.getFriendRequests();
    _onFriendRequestRejectedByUser = (_) => friendService.getFriendRequests();
    friendService.socket.on('friendRequestReceived', _onFriendRequestReceived!);
    friendService.socket.on(
      'friendRequestAcceptedByUser',
      _onFriendRequestAcceptedByUser!,
    );
    friendService.socket.on(
      'friendRequestRejectedByUser',
      _onFriendRequestRejectedByUser!,
    );

    // As the accepter/rejecter, we receive these confirmations
    _onFriendRequestAccepted = (_) => friendService.getFriendRequests();
    _onFriendRequestRejected = (_) => friendService.getFriendRequests();
    friendService.socket.on('friendRequestAccepted', _onFriendRequestAccepted!);
    friendService.socket.on('friendRequestRejected', _onFriendRequestRejected!);

    _onErrorMessage = (msg) {
      if (!mounted) return;
      final text = msg?.toString() ?? '';
      _showSnack(text, isError: true);
    };
    friendService.socket.on('errorMessage', _onErrorMessage!);
  }

  void _showSnack(String message, {bool isError = false}) {
    _messengerKey.currentState?.hideCurrentSnackBar();
    _messengerKey.currentState?.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
        content: Text(
          message,
          style: const TextStyle(
            color: Colors.white,
            fontFamily: FontFamily.PAPYRUS,
            fontWeight: FontWeight.bold,
          ),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // The problem by default is that when we dispose, we remove all listeners,
  // which can include listeners added by other parts of the app.
  // To avoid that, we keep references to our handlers and only remove those.
  // These removals do not affect the ones in friends-channel.dart, when we close the dialog.

  @override
  void dispose() {
    if (_onFriendRequests != null) {
      friendService.socket.offWithHandler('friendRequests', _onFriendRequests!);
    }
    if (_onFriendRequestReceived != null) {
      friendService.socket.offWithHandler(
        'friendRequestReceived',
        _onFriendRequestReceived!,
      );
    }
    if (_onFriendRequestAcceptedByUser != null) {
      friendService.socket.offWithHandler(
        'friendRequestAcceptedByUser',
        _onFriendRequestAcceptedByUser!,
      );
    }
    if (_onFriendRequestRejectedByUser != null) {
      friendService.socket.offWithHandler(
        'friendRequestRejectedByUser',
        _onFriendRequestRejectedByUser!,
      );
    }
    if (_onFriendRequestAccepted != null) {
      friendService.socket.offWithHandler(
        'friendRequestAccepted',
        _onFriendRequestAccepted!,
      );
    }
    if (_onFriendRequestRejected != null) {
      friendService.socket.offWithHandler(
        'friendRequestRejected',
        _onFriendRequestRejected!,
      );
    }
    if (_onErrorMessage != null) {
      friendService.socket.offWithHandler('errorMessage', _onErrorMessage!);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

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
                  'FRIENDS.FRIEND_REQUEST'.tr(),
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    fontFamily: FontFamily.PAPYRUS,
                    color: palette.mainTextColor,
                  ),
                ),
              ),
              body: SafeArea(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      )
                    : friendRequests.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24.0),
                          child: Text(
                            'FRIENDS.NO_FRIEND_REQUESTS'.tr(),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: palette.mainTextColor.withOpacity(0.9),
                              fontFamily: FontFamily.PAPYRUS,
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      )
                    : Column(
                        children: [
                          const SizedBox(height: 20),
                          Expanded(
                            child: GridView.builder(
                              padding: const EdgeInsets.all(10),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 2,
                                    crossAxisSpacing: 10,
                                    mainAxisSpacing: 10,
                                    childAspectRatio: 3.5,
                                  ),
                              itemCount: friendRequests.length,
                              itemBuilder: (context, index) {
                                final friendUser = friendRequests[index];
                                return UserCard(
                                  username:
                                      friendUser["username"] ??
                                      'FRIENDS.NO_FRIENDS'.tr(),
                                  avatarUrl:
                                      friendUser["avatarURL"] ??
                                      AppAssets.characters[3],
                                  showConnectionStatus: false,
                                  onAccept: () {
                                    final requesterUid =
                                        friendUser['uid'] as String?;
                                    if (requesterUid != null) {
                                      setState(() {
                                        final idx =
                                            index < friendRequests.length
                                            ? index
                                            : friendRequests.indexWhere(
                                                (e) => e['uid'] == requesterUid,
                                              );
                                        if (idx >= 0 &&
                                            idx < friendRequests.length) {
                                          friendRequests.removeAt(idx);
                                        }
                                      });
                                      friendService.acceptFriendRequest(
                                        requesterUid,
                                      );
                                      final username =
                                          friendUser['username'] as String? ??
                                          '';
                                      _showSnack(
                                        'FRIENDS.FRIEND_REQUEST_ACCEPTED_MESSAGE'
                                            .tr(
                                              namedArgs: {'username': username},
                                            ),
                                      );
                                    }
                                  },
                                  onReject: () {
                                    final requesterUid =
                                        friendUser['uid'] as String?;
                                    if (requesterUid != null) {
                                      setState(() {
                                        final idx =
                                            index < friendRequests.length
                                            ? index
                                            : friendRequests.indexWhere(
                                                (e) => e['uid'] == requesterUid,
                                              );
                                        if (idx >= 0 &&
                                            idx < friendRequests.length) {
                                          friendRequests.removeAt(idx);
                                        }
                                      });
                                      friendService.rejectFriendRequest(
                                        requesterUid,
                                      );
                                      final username =
                                          friendUser['username'] as String? ??
                                          '';
                                      _showSnack(
                                        'FRIENDS.FRIEND_REQUEST_REJECTED_MESSAGE'
                                            .tr(
                                              namedArgs: {'username': username},
                                            ),
                                        isError: true,
                                      );
                                    }
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
