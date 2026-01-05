import 'package:client_leger/screens/game/game.dart';
import 'package:client_leger/services/challenge/challenge_service.dart';
import 'package:client_leger/services/feedback/feedback_service.dart';
import 'package:client_leger/services/game/game-room-service.dart';
import 'package:client_leger/services/join_game/join_game_service.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:client_leger/models/lobby_player.dart';
import 'package:client_leger/utils/constants/challenges/challenges-list.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/widgets/buttons/game-code-button.dart';
import 'package:client_leger/widgets/forms/character-forms.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/screens/waiting/waiting.dart';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/screens/settings/settings.dart';
import 'package:client_leger/screens/shop/shop.dart';
import 'package:client_leger/screens/rankings/rankings.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:client_leger/widgets/common/chat_friends_overlay.dart';
import 'package:easy_localization/easy_localization.dart';

class JoinSession extends StatefulWidget {
  const JoinSession({
    Key? key,
    this.initialAccessCode,
    this.autoJoin = false,
    this.autoScanQr = false,
  }) : super(key: key);

  final String? initialAccessCode;
  final bool autoJoin;
  final bool autoScanQr;

  @override
  State<JoinSession> createState() => _JoinSessionState();
}

class _JoinSessionState extends State<JoinSession> {
  final double titleFontSize = 35.0;
  final double textFontSize = 25.0;
  final double centerHeight = 320;
  final TextEditingController codeController = TextEditingController();
  final JoinGameService _joinService = JoinGameService();
  String? _selectedAvatar;
  Map<String, int> _playerStats = {
    'speed': 4,
    'life': 4,
    'attack': 4,
    'defense': 4,
  };
  bool _quickElimination = false;

  @override
  void initState() {
    super.initState();
    _joinService.connect();

    SocketService.I.off('blockedByUserInRoom');
    SocketService.I.on('blockedByUserInRoom', (data) async {
      if (!mounted) return;
      try {
        final map = Map<String, dynamic>.from(data as Map);
        final List<dynamic> blockedUsers =
            (map['blockedUsers'] as List?) ?? const [];
        final String roomId = (map['roomId'] ?? '').toString();
        final int count = blockedUsers.length;
        final String suffix = count > 1 ? 's' : '';
        final bool confirm = await AppDialogs.showConfirm(
          context: context,
          title: 'FRIENDS.USER_BLOCKED_TITLE'.tr(),
          message:
              "Il y a $count joueur$suffix que vous avez bloqué dans cette partie.\nVoulez-vous quand même rejoindre cette partie ?",
        );
        if (confirm && roomId.isNotEmpty) {
          SocketService.I.emit('joinRoom', {
            'roomId': roomId,
            'forceJoin': true,
          });
        }
      } catch (_) {}
    });
    final initial = widget.initialAccessCode?.trim();
    if (initial != null && initial.isNotEmpty) {
      codeController.text = initial;
      if (widget.autoJoin) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _onJoinPressed();
        });
      }
    } else if (widget.autoScanQr) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _scanAndJoin();
      });
    }
  }

  @override
  void dispose() {
    SocketService.I.off('blockedByUserInRoom');
    codeController.dispose();
    super.dispose();
  }

  Future<bool> _openCharacterForm({
    Set<String> disabledNames = const {},
    int? entryFee,
  }) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (_) => CharacterForms(
        disabledAvatarNames: disabledNames,
        entryFee: entryFee,
        onSelectAvatar: (avatarPath) {
          _selectedAvatar = avatarPath;
          _joinService.selectCharacter(avatarPath);
        },
        onConfirm:
            ({
              required String name,
              required String avatarPath,
              required Map<String, int> stats,
            }) {
              _selectedAvatar = avatarPath;
              _playerStats = stats;
            },
      ),
    );
    if (result == null) return false; // user cancelled
    _selectedAvatar = result['avatarPath'] as String? ?? _selectedAvatar;
    _playerStats = Map<String, int>.from(
      result['stats'] as Map? ?? _playerStats,
    );

    _quickElimination = result['quickElimination'] ?? false;

    return true;
  }

  Future<void> _scanAndJoin() async {
    final scanned = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const _QrScannerPage()),
    );
    if (!mounted) return;
    if (scanned == null) {
      if (widget.autoScanQr) {
        Navigator.of(context).maybePop();
      }
      return;
    }
    var code = scanned.trim();
    code = code.replaceAll(RegExp(r'[^A-Za-z0-9]'), '');
    // Validate that the QR contains a 4-digit access code
    final err = _joinService.validateCode(code);
    if (err != null) {
      FeedbackService.showLong(context, err);
      return;
    }
    codeController.text = code;
    _onJoinPressed();
  }

  void _onJoinPressed() {
    if (!SocketService.I.isConnected) {
      FeedbackService.showLong(
        context,
        "Connexion au serveur en cours... Réessayez dans un instant.",
      );
      return;
    }
    final code = codeController.text.trim();
    _joinService.handleJoinGame(context, code, (room, message) async {
      if (room != null) {
        final disabledNames = room.availableAvatars
            .where((a) => (a['isTaken'] ?? false) == true)
            .map((a) => (a['name'] ?? '').toString().toLowerCase())
            .toSet();

        final confirmed = await _openCharacterForm(
          disabledNames: disabledNames,
          entryFee: room.entryFee,
        );
        if (!confirmed) {
          _joinService.leaveRoom(room.roomId);
          return;
        }

        final profile = await AuthService().getCurrentUserProfile();
        final firebaseUser = FirebaseAuth.instance.currentUser;
        final username = profile?.username ?? firebaseUser?.email ?? 'Player';

        final player = Player(
          name: username,
          avatar: _selectedAvatar!,
          stats: _playerStats,
        );

        if (!mounted) return;
        _joinService.joinLobby(
          context,
          roomId: room.roomId,
          player: player,
          onNavigateToLobby: () {
            SocketService.I.off('obtainRoomInfo');
            SocketService.I.once('obtainRoomInfo', (data) {
              final roomMap = Map<String, dynamic>.from(data as Map);
              final players = LobbyPlayer.fromRoom(roomMap);
              final gameStatus = roomMap['gameStatus']?.toString() ?? 'lobby';

              String initialMapName = '';
              String initialMode = '';
              String initialAvailability = '';
              final gm = roomMap['gameMap'];
              if (gm is Map) {
                initialMapName = (gm['name'] ?? gm['mapName'] ?? '').toString();
                initialMode = (gm['mode'] ?? '').toString();
              } else if (gm is String) {
                initialMapName = gm;
              }
              final av = roomMap['gameAvailability'];
              if (av is String) initialAvailability = av;

              final selfId = SocketService.I.id ?? '';
              final initialSelf = LobbyPlayer(
                id: selfId,
                name: username,
                avatarPath: _selectedAvatar ?? '',
                isBot: false,
                status: 'regular-player',
                behavior: 'sentient',
                assignedChallenge: ChallengesConstants().fakeChallenge,
              );

              //  export enum GameStatus {
              //     Lobby = 'lobby',
              //     Started = 'started',
              //     Ended = 'ended',
              // }

              if (context.mounted && gameStatus == 'lobby') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => WaitingPage(
                      roomCode: room.roomId,
                      initialIsAdmin: false,
                      initialSelf: initialSelf,
                      initialPlayers: players,
                      initialMapName: initialMapName,
                      initialMode: initialMode,
                      initialAvailability: initialAvailability,
                      initialEntryFee: room.entryFee,
                      initialQuickElimination: _quickElimination,
                    ),
                  ),
                );
              } else {
                final gameRoomService = GameRoomService(isDropIn: true);
                gameRoomService.initialize();
                gameRoomService.socket.emit("GetRoom");
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (_) => Game(
                      room: roomMap,
                      accesCode: room.roomId,
                      gameRoomService: gameRoomService,
                    ),
                  ),
                );
              }
            });
            SocketService.I.emit('GetRoom');
          },
        );
      } else if (message.isNotEmpty) {
        // Show unified OK-only dialog instead of a toast
        AppDialogs.showInfo(
          context: context,
          title: 'JOIN_PAGE.ERRORS.ROOM_NOT_FOUND'.tr(),
          message: message,
          barrierDismissible: true,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          ThemedBackground(
            child: SafeArea(
              child: Column(
                children: [
                  AppHeader(
                    title: 'PAGE_HEADER.JOIN_GAME'.tr(),
                    onBack: () => Navigator.of(context).maybePop(),
                    onTapRankings: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const RankingsPage()),
                      );
                    },
                    onTapSettings: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SettingsPage()),
                      );
                    },
                    onTapShop: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ShopPage()),
                      );
                    },
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16.0),
                    child: Divider(color: Colors.white70),
                  ),
                  Expanded(
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final bottomInset = MediaQuery.of(
                          context,
                        ).viewInsets.bottom;
                        return SingleChildScrollView(
                          padding: EdgeInsets.fromLTRB(
                            60,
                            0,
                            80,
                            120 + bottomInset,
                          ),
                          keyboardDismissBehavior:
                              ScrollViewKeyboardDismissBehavior.onDrag,
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              minHeight: constraints.maxHeight,
                            ),
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'JOIN_PAGE.ENTER_CODE'.tr(),
                                    style: TextStyle(
                                      fontSize: textFontSize,
                                      fontFamily: FontFamily.PAPYRUS,
                                      color: Colors.white,
                                    ),
                                  ),
                                  SizedBox(height: 20),
                                  GameCodeButton(controller: codeController),
                                  SizedBox(height: 27.0),
                                  Center(
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        ConstrainedBox(
                                          constraints:
                                              const BoxConstraints.tightFor(
                                                width: 200,
                                                height: 60,
                                              ),
                                          child: AppPrimaryButton(
                                            label: 'JOIN_PAGE.JOIN'.tr(),
                                            onPressed: _onJoinPressed,
                                            height: 60,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Tooltip(
                                          message: 'WAITING_PAGE.SCAN_TO_JOIN'
                                              .tr(),
                                          child: ValueListenableBuilder<ThemePalette>(
                                            valueListenable:
                                                ThemeConfig.palette,
                                            builder: (context, palette, _) {
                                              final borderRadius =
                                                  BorderRadius.circular(30);
                                              final shadows = <BoxShadow>[
                                                BoxShadow(
                                                  color:
                                                      palette.primaryBoxShadow,
                                                  blurRadius: 10,
                                                  spreadRadius: 3,
                                                  offset: const Offset(0, 0),
                                                ),
                                                BoxShadow(
                                                  color: palette.secondaryDark
                                                      .withValues(alpha: 0.8),
                                                  blurRadius: 12,
                                                  spreadRadius: 1,
                                                  offset: const Offset(0, 6),
                                                ),
                                                BoxShadow(
                                                  color: const Color(
                                                    0xFFFFFFF0,
                                                  ).withValues(alpha: 0.9),
                                                  blurRadius: 4,
                                                  spreadRadius: -4,
                                                  offset: const Offset(0, -3),
                                                ),
                                              ];

                                              final decoration = BoxDecoration(
                                                gradient: LinearGradient(
                                                  colors: palette
                                                      .primaryGradientColors,
                                                  stops: palette
                                                      .primaryGradientStops,
                                                  begin: const Alignment(-1, 0),
                                                  end: const Alignment(1, 0),
                                                ),
                                                borderRadius: borderRadius,
                                                border: Border.all(
                                                  color: palette.primaryLight,
                                                  width: 2.0,
                                                ),
                                                boxShadow: shadows,
                                              );

                                              return Material(
                                                color: Colors.transparent,
                                                borderRadius: borderRadius,
                                                child: InkWell(
                                                  onTap: _scanAndJoin,
                                                  borderRadius: borderRadius,
                                                  splashColor: palette
                                                      .invertedTextColor
                                                      .withValues(alpha: 0.16),
                                                  highlightColor:
                                                      Colors.transparent,
                                                  child: Container(
                                                    decoration: decoration,
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 16,
                                                          vertical: 12,
                                                        ),
                                                    child: Icon(
                                                      Icons.qr_code_scanner,
                                                      color: palette
                                                          .invertedTextColor,
                                                      size: 28,
                                                    ),
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 18),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          const ChatFriendsOverlay(),
        ],
      ),
    );
  }
}

class _QrScannerPage extends StatefulWidget {
  const _QrScannerPage({Key? key}) : super(key: key);

  @override
  State<_QrScannerPage> createState() => _QrScannerPageState();
}

class _QrScannerPageState extends State<_QrScannerPage> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    formats: const [BarcodeFormat.qrCode],
  );
  bool _handled = false;

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    final value = barcodes.first.rawValue;
    if (value == null) return;
    _handled = true;
    Navigator.of(context).pop<String>(value);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('WAITING_PAGE.SCAN_TO_JOIN'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _controller.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch),
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          IgnorePointer(
            child: Center(
              child: Container(
                width: MediaQuery.of(context).size.width * 0.4,
                height: MediaQuery.of(context).size.width * 0.4,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white70, width: 2),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
