import 'dart:async';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/models/chat_message.dart';
import 'package:client_leger/services/chat/chat_service.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/services/chat/chat_unread_service.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:client_leger/services/socket/socket_service.dart';

class WaitingChat extends StatefulWidget {
  const WaitingChat({
    super.key,
    required this.roomCode,
    required this.username,
    this.autofocus = false,
    this.readOnly = false,
    this.showHeader = true,
    this.compact = false,
    this.reactionsGrid = false,
    this.reactionsGridColumns = 2,
  });

  final String roomCode;
  final String username;
  final bool autofocus;
  final bool readOnly;
  final bool showHeader;
  final bool compact;
  final bool reactionsGrid;
  final int reactionsGridColumns;

  @override
  State<WaitingChat> createState() => _WaitingChatState();
}

class _WaitingChatState extends State<WaitingChat> with WidgetsBindingObserver {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _inputFocusNode = FocusNode();
  final List<ChatMessage> _messages = [];
  String? _error;
  StreamSubscription<ChatMessage>? _subscription;
  bool _loading = false;
  final List<String> _reactions = const ['😀', '🔥', '👍', '❤️', '😂', '😡'];
  String _selectedReaction = '😀';
  String? _lastOwnMessage;
  late String _activeChannel;
  bool _isLoadingHistory = false;
  final List<ChatMessage> _pendingWhileLoading = [];
  StreamSubscription<UserAccelerometerEvent>? _accelSub;
  bool _showEmojiPicker = false;
  bool _isChatVisible = true;
  Map<String, String> _avatarsByUsername = <String, String>{};
  String? _selfAvatarUrl;

  // Shake detection constants
  static const double _shakeThreshold = 1.0;
  static const int _shakeDebounceMs = 1300;
  static const int _shakeBeforeReset = 5;
  static const double _splitFactor = 1.5;
  static const double _reversalFactor = 0.7;
  DateTime _lastShakeTime = DateTime.fromMillisecondsSinceEpoch(0);
  double _recentMaxX = 0;
  double _recentMaxY = 0;
  int _samplesSinceReset = 0;
  int _signChangesX = 0;
  int _signChangesY = 0;
  double? _lastSampleX;
  double? _lastSampleY;
  int? _firstSignChangeSampleX;
  int? _firstSignChangeSampleY;

  void _dismissKeyboard() {
    if (_inputFocusNode.hasFocus) {
      _inputFocusNode.unfocus();
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _activeChannel = widget.roomCode;
    _loadHistory();
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    _loadAvatarsMapping();
    _loadSelfAvatar();

    ChatUnreadService.I.init();
    ChatUnreadService.I.setReadingGlobal(
      _activeChannel.toLowerCase() == 'global',
    );

    ChatService.I.ensureListening();
    _subscription = ChatService.I.stream.listen((msg) {
      final isGlobal =
          msg.type.toLowerCase() == 'global' || msg.roomId == 'global';
      final isForActiveChannel = _activeChannel.toLowerCase() == 'global'
          ? isGlobal
          : msg.roomId == _activeChannel;
      if (isForActiveChannel) {
        if (_isLoadingHistory) {
          _pendingWhileLoading.add(msg);
        } else {
          setState(() => _messages.add(msg));
        }
        if (msg.username == widget.username) {
          _lastOwnMessage = msg.message;
        }
        Future.delayed(const Duration(milliseconds: 40), () {
          if (mounted) _scrollToBottom(animated: true);
        });
      }
    });
    _startShakeListener();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _subscription?.cancel();
    _inputFocusNode.dispose();
    _accelSub?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    ChatUnreadService.I.setReadingGlobal(false);
    super.dispose();
  }

  Future<void> _loadAvatarsMapping() async {
    try {
      await SocketService.I.connect();
      SocketService.I.emit("getAllUsers");
      void Function(dynamic)? handler;
      handler = (data) {
        try {
          final list = List<dynamic>.from(data);
          final map = <String, String>{};
          for (final item in list) {
            if (item is Map) {
              final username = (item['username'] ?? '').toString().trim();
              var avatar = (item['avatarURL'] ?? '').toString().trim();
              if (avatar.startsWith('./')) avatar = avatar.substring(2);
              if (username.isNotEmpty && avatar.isNotEmpty) {
                map[username.toLowerCase()] = avatar;
              }
            }
          }
          if (mounted) {
            setState(() {
              _avatarsByUsername = map;
            });
          }
        } catch (_) {
        } finally {
          try {
            SocketService.I.offWithHandler("allUsers", handler!);
          } catch (_) {}
        }
      };
      SocketService.I.on("allUsers", handler);
    } catch (_) {}
  }

  Future<void> _loadSelfAvatar() async {
    try {
      final profile = await AuthService().getCurrentUserProfile();
      final avatar = profile?.avatarURL?.trim();
      final username = profile?.username?.trim();
      if (avatar != null &&
          avatar.isNotEmpty &&
          username != null &&
          username.isNotEmpty) {
        var normalized = avatar;
        if (normalized.startsWith('./')) normalized = normalized.substring(2);
        setState(() {
          _selfAvatarUrl = normalized;
          _avatarsByUsername[username.toLowerCase()] = normalized;
        });
      }
    } catch (_) {}
  }

  @override
  void didChangeMetrics() {
    if (!mounted) return;
    Future.delayed(const Duration(milliseconds: 120), () {
      if (mounted) _scrollToBottom();
    });
  }

  Future<void> _loadHistory() async {
    setState(() {
      _error = null;
      _loading = true;
      _isLoadingHistory = true;
    });
    try {
      final list = await ChatService.I.fetchHistory(_activeChannel);
      setState(() {
        _messages
          ..clear()
          ..addAll(list);
        if (_pendingWhileLoading.isNotEmpty) {
          _pendingWhileLoading.sort(
            (a, b) => a.timestamp.compareTo(b.timestamp),
          );
          _messages.addAll(_pendingWhileLoading);
          _pendingWhileLoading.clear();
        }
        _loading = false;
        _isLoadingHistory = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    } catch (e) {
      setState(() {
        _error = 'Erreur de chargement';
        _loading = false;
        _isLoadingHistory = false;
      });
    }
  }

  void _scrollToBottom({bool animated = false}) {
    if (!_scrollController.hasClients) return;
    final target = _scrollController.position.minScrollExtent;
    final current = _scrollController.position.pixels;
    if ((current - target).abs() < 4) return;
    if (animated) {
      _scrollController.animateTo(
        target,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
      );
    } else {
      _scrollController.jumpTo(target);
    }
  }

  Widget _buildAvatar(String? avatarURL) {
    const double avatarRadius = 17;
    var safe = (avatarURL ?? '').trim();
    if (safe.startsWith('./')) safe = safe.substring(2);

    if (safe.isEmpty) {
      return CircleAvatar(
        radius: avatarRadius,
        backgroundColor: Colors.black26,
        child: const Icon(Icons.person, size: 20, color: Colors.white70),
      );
    }
    final isNetwork = safe.startsWith('http://') || safe.startsWith('https://');
    if (isNetwork) {
      return CircleAvatar(
        radius: avatarRadius,
        backgroundColor: Colors.black26,
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: safe,
            width: avatarRadius * 2,
            height: avatarRadius * 2,
            fit: BoxFit.cover,
            placeholder: (_, __) =>
                const Icon(Icons.person, size: 20, color: Colors.white38),
            errorWidget: (_, __, ___) =>
                const Icon(Icons.person_off, size: 20, color: Colors.white54),
          ),
        ),
      );
    }
    return CircleAvatar(
      radius: avatarRadius,
      backgroundColor: Colors.black26,
      backgroundImage: AssetImage(safe),
      onBackgroundImageError: (_, __) {},
      child: null,
    );
  }

  Widget _buildMessage(ChatMessage m, ThemePalette palette) {
    final time =
        '${m.timestamp.toLocal().hour.toString().padLeft(2, '0')}:'
        '${m.timestamp.toLocal().minute.toString().padLeft(2, '0')}:'
        '${m.timestamp.toLocal().second.toString().padLeft(2, '0')}';
    final String displayName = (() {
      final name = (m.username).toString().trim();
      if (widget.reactionsGrid && name.length > 10) {
        return name.substring(0, 10) + '...';
      }
      return name;
    })();

    final avatarToDisplay =
        m.avatarURL ??
        (m.username.toLowerCase() == widget.username.toLowerCase()
            ? _selfAvatarUrl
            : _avatarsByUsername[m.username.toLowerCase()]);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildAvatar(avatarToDisplay),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        time,
                        style: const TextStyle(
                          color: Color.fromRGBO(167, 167, 167, 1),
                          fontWeight: FontWeight.bold,
                          fontFamily: FontFamily.PAPYRUS,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        displayName,
                        style: TextStyle(
                          color: palette.primary,
                          fontWeight: FontWeight.bold,
                          fontFamily: FontFamily.PAPYRUS,
                          fontSize: 16,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    m.message,
                    style: const TextStyle(
                      color: Colors.white,
                      fontFamily: FontFamily.PAPYRUS,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _send() {
    final raw = _controller.text;
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      if (!_inputFocusNode.hasFocus) {
        _inputFocusNode.requestFocus();
      }
      return;
    }
    if (_activeChannel.toLowerCase() == 'global') {
      ChatService.I.sendGlobal(message: trimmed);
    } else {
      ChatService.I.sendToRoom(roomId: _activeChannel, message: trimmed);
    }
    _lastOwnMessage = trimmed;
    _controller.clear();
    if (!_inputFocusNode.hasFocus) {
      _inputFocusNode.requestFocus();
    }
  }

  void _sendReaction() {
    final msg = _selectedReaction;
    if (_activeChannel.toLowerCase() == 'global') {
      ChatService.I.sendGlobal(message: msg);
    } else {
      ChatService.I.sendToRoom(roomId: _activeChannel, message: msg);
    }
    _lastOwnMessage = msg;
  }

  void _resendLastMessage() {
    final last = _lastOwnMessage;
    if (last == null || last.trim().isEmpty) return;
    if (_activeChannel.toLowerCase() == 'global') {
      ChatService.I.sendGlobal(message: last);
    } else {
      ChatService.I.sendToRoom(roomId: _activeChannel, message: last);
    }
  }

  void _onChannelChanged(String value) {
    if (value == _activeChannel) return;
    setState(() {
      _activeChannel = value;
      _loading = true;
      _isLoadingHistory = true;
      _messages.clear();
      _pendingWhileLoading.clear();
    });
    ChatUnreadService.I.setReadingGlobal(value.toLowerCase() == 'global');
    _loadHistory();
  }

  String _channelDisplayLabel(String value) {
    if (value.toLowerCase() == 'global') return 'CHAT.GENERAL';
    return 'WAITING_PAGE.TITLE';
  }

  void _startShakeListener() {
    _accelSub = userAccelerometerEvents.listen((event) {
      final ax = event.x;
      final ay = event.y;
      _recentMaxX = ax.abs() > _recentMaxX ? ax.abs() : _recentMaxX;
      _recentMaxY = ay.abs() > _recentMaxY ? ay.abs() : _recentMaxY;

      const double _minDeltaForReversal = 0.1;
      if (_lastSampleX != null) {
        final prevSign = _lastSampleX! >= 0 ? 1 : -1;
        final newSign = ax >= 0 ? 1 : -1;
        if (newSign != prevSign &&
            (ax - _lastSampleX!).abs() > _minDeltaForReversal) {
          _signChangesX++;
          _firstSignChangeSampleX ??= _samplesSinceReset;
        }
      }
      if (_lastSampleY != null) {
        final prevSign = _lastSampleY! >= 0 ? 1 : -1;
        final newSign = ay >= 0 ? 1 : -1;
        if (newSign != prevSign &&
            (ay - _lastSampleY!).abs() > _minDeltaForReversal) {
          _signChangesY++;
          _firstSignChangeSampleY ??= _samplesSinceReset;
        }
      }
      _lastSampleX = ax;
      _lastSampleY = ay;

      _samplesSinceReset++;
      if (_samplesSinceReset >= _shakeBeforeReset) {
        final now = DateTime.now();
        final elapsed = now.difference(_lastShakeTime).inMilliseconds;
        if (elapsed > _shakeDebounceMs) {
          final dominantY =
              _recentMaxY > _shakeThreshold &&
              _recentMaxY > _recentMaxX * _splitFactor &&
              _signChangesY > 0 &&
              _firstSignChangeSampleY != null &&
              _firstSignChangeSampleY! <=
                  (_shakeBeforeReset * _reversalFactor).floor();
          final dominantX =
              _recentMaxX > _shakeThreshold &&
              _recentMaxX > _recentMaxY * _splitFactor &&
              _signChangesX > 0 &&
              _firstSignChangeSampleX != null &&
              _firstSignChangeSampleX! <=
                  (_shakeBeforeReset * _reversalFactor).floor();
          if (dominantY) {
            _lastShakeTime = now;
            _resendLastMessage();
          } else if (dominantX) {
            _lastShakeTime = now;
            _sendReaction();
          }
        }
        _recentMaxX = 0;
        _recentMaxY = 0;
        _samplesSinceReset = 0;
        _signChangesX = 0;
        _signChangesY = 0;
        _lastSampleX = null;
        _lastSampleY = null;
        _firstSignChangeSampleX = null;
        _firstSignChangeSampleY = null;
      }
    });
  }

  Widget _buildEmojiPicker(ThemePalette palette) {
    return Container(
      height: 90,
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        children: [
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 6,
                mainAxisSpacing: 6,
                crossAxisSpacing: 6,
                childAspectRatio: 1,
              ),
              itemCount: _reactions.length,
              itemBuilder: (context, index) {
                final emoji = _reactions[index];
                final selected = emoji == _selectedReaction;
                return InkWell(
                  onTap: () {
                    setState(() {
                      _selectedReaction = emoji;
                      _showEmojiPicker = false;
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: selected
                          ? palette.primary.withValues(alpha: 0.25)
                          : Colors.black45,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: selected ? palette.primary : Colors.white24,
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: Text(emoji, style: const TextStyle(fontSize: 20)),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ThemedBackground(
      child: Container(
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        clipBehavior: Clip.antiAlias,
        child: ValueListenableBuilder<ThemePalette>(
          valueListenable: ThemeConfig.palette,
          builder: (context, palette, _) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header with channel selector and toggle
              if (widget.showHeader)
                GestureDetector(
                  onTap: _dismissKeyboard,
                  behavior: HitTestBehavior.translucent,
                  child: Container(
                    padding: EdgeInsets.all(widget.compact ? 8 : 12),
                    decoration: const BoxDecoration(
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(20),
                        topRight: Radius.circular(20),
                      ),
                    ),
                    child: Row(
                      children: [
                        const SizedBox(width: 8),
                        // Only show channel selector when chat is visible
                        if (_isChatVisible)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black45,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: Colors.white24),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _activeChannel.toLowerCase() == 'global'
                                    ? 'global'
                                    : widget.roomCode,
                                dropdownColor: const Color(0xFF2C2C2C),
                                iconEnabledColor: Colors.white,
                                iconSize: 18,
                                isDense: true,
                                style: TextStyle(
                                  color: palette.primary,
                                  fontFamily: FontFamily.PAPYRUS,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                                items: <String>[widget.roomCode, 'global'].map((
                                  value,
                                ) {
                                  return DropdownMenuItem<String>(
                                    value: value,
                                    child: Text(
                                      _channelDisplayLabel(value).tr(),
                                    ),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  if (value != null) _onChannelChanged(value);
                                },
                              ),
                            ),
                          ),
                        const Spacer(),
                        // Toggle button - always visible
                        // InkWell(
                        //   onTap: () {
                        //     setState(() {
                        //       _isChatVisible = !_isChatVisible;
                        //       // Close emoji picker when hiding chat
                        //       if (!_isChatVisible) {
                        //         _showEmojiPicker = false;
                        //       }
                        //     });
                        //   },
                        //   child: Container(
                        //     padding: const EdgeInsets.all(8),
                        //     decoration: BoxDecoration(
                        //       color: Colors.black45,
                        //       borderRadius: BorderRadius.circular(20),
                        //       border: Border.all(color: Colors.white24),
                        //     ),
                        //     child: Icon(
                        //       _isChatVisible
                        //           ? Icons.chevron_right
                        //           : Icons.chevron_left,
                        //       color: palette.primary,
                        //       size: 20,
                        //     ),
                        //   ),
                        // ),
                        const SizedBox(width: 8),
                      ],
                    ),
                  ),
                ),

              // Messages area
              if (_isChatVisible)
                Expanded(
                  child: GestureDetector(
                    onTap: _dismissKeyboard,
                    behavior: HitTestBehavior.translucent,
                    child: Container(
                      child: _error != null
                          ? Center(
                              child: Text(
                                _error!,
                                style: const TextStyle(color: Colors.redAccent),
                              ),
                            )
                          : (_messages.isEmpty
                                ? Center(
                                    child: _loading
                                        ? const SizedBox(
                                            width: 32,
                                            height: 32,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white70,
                                            ),
                                          )
                                        : Text(
                                            'CHAT.NO_MSG'.tr(),
                                            style: TextStyle(
                                              color: Colors.white70,
                                              fontFamily: FontFamily.PAPYRUS,
                                            ),
                                          ),
                                  )
                                : ListView.builder(
                                    controller: _scrollController,
                                    reverse: true,
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 8,
                                    ),
                                    itemCount: _messages.length,
                                    itemBuilder: (context, index) {
                                      final reversedIndex =
                                          _messages.length - 1 - index;
                                      return _buildMessage(
                                        _messages[reversedIndex],
                                        palette,
                                      );
                                    },
                                  )),
                    ),
                  ),
                ),

              // Emoji picker overlay
              if (_showEmojiPicker && _isChatVisible)
                _buildEmojiPicker(palette),

              // Input area
              if (_isChatVisible)
                SafeArea(
                  top: false,
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFF1E1E1E),
                      borderRadius: BorderRadius.vertical(
                        bottom: Radius.circular(16),
                      ),
                    ),
                    padding: EdgeInsets.symmetric(
                      horizontal: widget.compact ? 8 : 12,
                      vertical: 8,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Selected emoji display
                        InkWell(
                          onTap: () {
                            setState(
                              () => _showEmojiPicker = !_showEmojiPicker,
                            );
                          },
                          child: Container(
                            width: 44,
                            height: 44,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: palette.primary.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: palette.primary,
                                width: 2,
                              ),
                            ),
                            child: Text(
                              _selectedReaction,
                              style: const TextStyle(fontSize: 24),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Text input
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.25),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _inputFocusNode.hasFocus
                                    ? palette.primary
                                    : Colors.white24,
                              ),
                            ),
                            child: TextField(
                              controller: _controller,
                              focusNode: _inputFocusNode,
                              style: TextStyle(
                                color: palette.primary,
                                fontFamily: FontFamily.PAPYRUS,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                              autofocus: widget.autofocus,
                              readOnly: widget.readOnly,
                              enabled: !widget.readOnly,
                              textInputAction: TextInputAction.send,
                              maxLength: 200,
                              decoration: InputDecoration(
                                hintText: 'CHAT.TITLE'.tr(),
                                hintStyle: TextStyle(
                                  color: palette.primary.withOpacity(0.6),
                                  fontFamily: FontFamily.PAPYRUS,
                                  fontWeight: FontWeight.bold,
                                ),
                                border: InputBorder.none,
                                counterText: "",
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                              ),
                              onSubmitted: (_) => _send(),
                              onEditingComplete: () {},
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
