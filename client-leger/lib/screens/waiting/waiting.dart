import 'dart:async';
import 'package:client_leger/models/challenge.dart';
import 'package:client_leger/screens/game/game.dart';
import 'package:client_leger/services/game/game-room-service.dart';
import 'package:client_leger/utils/constants/challenges/challenges-list.dart';
import 'package:client_leger/widgets/challenge-card/challenge-card.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:client_leger/models/lobby_player.dart';
import 'package:client_leger/widgets/waiting/waiting_header.dart';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/widgets/waiting/lobby_players_row.dart';
import 'package:client_leger/widgets/waiting/admin_controls.dart';
import 'package:client_leger/widgets/waiting/waiting_chat.dart';
import 'package:client_leger/services/waiting/waiting_room_service.dart';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:easy_localization/easy_localization.dart';

class WaitingPage extends StatefulWidget {
  const WaitingPage({
    super.key,
    required this.roomCode,
    this.initialIsAdmin = false,
    this.initialSelf,
    this.initialPlayers,
    this.initialMapName,
    this.initialMode,
    this.initialAvailability,
    this.initialEntryFee,
    this.initialQuickElimination,
  });

  final String roomCode;
  final bool initialIsAdmin;
  final LobbyPlayer? initialSelf;
  final List<LobbyPlayer>? initialPlayers;
  final String? initialMapName;
  final String? initialMode;
  final String? initialAvailability; // 'public' | 'friends-only'
  final int? initialEntryFee;
  final bool? initialQuickElimination;

  @override
  State<WaitingPage> createState() => _WaitingPageState();
}

class _WaitingPageState extends State<WaitingPage> {
  late final WaitingRoomService _service;

  List<LobbyPlayer> _players = [];
  bool _isAdmin = false;
  bool _isLocked = false;
  String _mapName = '';
  String _mode = '';
  String _availability = '';
  String _username = '';
  bool _hasLeftRoom = false;
  bool _dropInEnabled = false;
  int _entryFee = 0;
  StreamSubscription<int>? _entryFeeSub;
  bool _quickElimination = false;

  StreamSubscription<List<LobbyPlayer>>? _playersSub;
  StreamSubscription<bool>? _adminSub;
  StreamSubscription<bool>? _lockedSub;
  StreamSubscription<String>? _mapNameSub;
  StreamSubscription<String>? _modeSub;
  StreamSubscription<String>? _availabilitySub;
  StreamSubscription<void>? _startSub;
  StreamSubscription<void>? _kickSub;
  StreamSubscription<String?>? _deletedSub;
  StreamSubscription<bool>? _dropInSub;

  Future<void> _showMaxPlayersReachedDialog() async {
    await AppDialogs.showInfo(
      context: context,
      title: 'DIALOG.TITLE.MAX_PLAYERS'.tr(),
      message: 'DIALOG.MESSAGE.MAX_PLAYERS'.tr(),
      barrierDismissible: true,
    );
  }

  Future<String?> _openBotChoiceDialog() async {
    return showDialog<String>(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.85),
      builder: (ctx) {
        Widget optionCard({
          required String title,
          required String asset,
          required String description,
          required VoidCallback onTap,
          required Color accent,
        }) {
          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: accent.withOpacity(0.35),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: accent.withOpacity(0.90)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.asset(
                        asset,
                        height: 260,
                        fit: BoxFit.contain,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        fontFamily: FontFamily.PAPYRUS,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      description,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontFamily: FontFamily.PAPYRUS,
                        fontWeight: FontWeight.w800,
                      ),
                      softWrap: true,
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          insetPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 16),
          child: FractionallySizedBox(
            widthFactor: 0.75,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'WAITING_PAGE.BOT_PROFILE_POPUP_TITLE'.tr(),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 38,
                              fontFamily: FontFamily.PAPYRUS,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          icon: const Icon(Icons.close, color: Colors.white70),
                          tooltip: 'DIALOG.CLOSE'.tr(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: optionCard(
                            title: 'WAITING_PAGE.BOT_PROFILES.DEFENSIVE.TITLE'
                                .tr(),
                            asset: 'assets/images/objects/helm-of-darkness.jpg',
                            description:
                                '${'WAITING_PAGE.BOT_PROFILES.DEFENSIVE.DESCRIPTION_1'.tr()}\n${'WAITING_PAGE.BOT_PROFILES.DEFENSIVE.DESCRIPTION_2'.tr()}',
                            onTap: () => Navigator.of(ctx).pop('defensive'),
                            accent: Colors.lightBlueAccent,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: optionCard(
                            title: 'WAITING_PAGE.BOT_PROFILES.AGGRESSIVE.TITLE'
                                .tr(),
                            asset: 'assets/images/objects/zeus-lightning.jpg',
                            description:
                                '${'WAITING_PAGE.BOT_PROFILES.AGGRESSIVE.DESCRIPTION_1'.tr()}\n${'WAITING_PAGE.BOT_PROFILES.AGGRESSIVE.DESCRIPTION_2'.tr()}',
                            onTap: () => Navigator.of(ctx).pop('aggressive'),
                            accent: Colors.redAccent,
                          ),
                        ),
                      ],
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

  Future<void> _onAddBotPressed() async {
    if (_service.isLobbyFull) {
      await _showMaxPlayersReachedDialog();
      return;
    }
    final choice = await _openBotChoiceDialog();
    if (choice == null) return; // cancelled
    if (_service.isLobbyFull) {
      await _showMaxPlayersReachedDialog();
      return;
    }
    _service.createBot(choice);
  }

  void _bindToService() {
    _playersSub = _service.players$.listen((players) {
      if (mounted) setState(() => _players = players);
    });
    _adminSub = _service.isAdmin$.listen((v) {
      if (mounted) setState(() => _isAdmin = v);
    });
    _lockedSub = _service.isLocked$.listen((v) {
      if (mounted) setState(() => _isLocked = v);
    });

    _dropInSub = _service.dropInEnabled$.listen((value) {
      if (mounted) setState(() => _dropInEnabled = value);
    });

    _mapNameSub = _service.mapName$.listen((name) {
      if (mounted) setState(() => _mapName = name);
    });
    _entryFeeSub = _service.entryFee$.listen((fee) {
      if (mounted) setState(() => _entryFee = fee);
    });
    _startSub = _service.startGame$.listen((room) {
      if (!mounted) return;
      _service.dispose();
      final gameRoomService = GameRoomService();
      gameRoomService.initialize();
      gameRoomService.socket.emit("GetRoom");

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) {
            return Game(
              room: room,
              accesCode: widget.roomCode,
              gameRoomService: gameRoomService,
            );
          },
        ),
      );
    });

    _modeSub = _service.mode$.listen((m) {
      if (mounted) setState(() => _mode = m);
    });
    _availabilitySub = _service.availability$.listen((a) {
      if (mounted) setState(() => _availability = a);
    });

    _kickSub = _service.kicked$.listen((_) async {
      if (mounted) {
        await AppDialogs.showInfo(
          context: context,
          title: 'DIALOG.TITLE.KICKED_OUT'.tr(),
          message: 'DIALOG.MESSAGE.KICKED_OUT'.tr(),
          barrierDismissible: false,
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    });
    _deletedSub = _service.roomDeleted$.listen((msg) async {
      if (mounted) {
        final text = (msg != null && msg.isNotEmpty)
            ? msg
            : 'DIALOG.MESSAGE.CANCELED_MATCH'.tr();
        await AppDialogs.showInfo(
          context: context,
          title: 'DIALOG.TITLE.GAME_CANCELED'.tr(),
          message: text,
          barrierDismissible: false,
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _service = WaitingRoomService(widget.roomCode);
    _service.quickElimination$.listen((v) {
      if (mounted) {
        setState(() => _quickElimination = v);
      }
    });

    _isAdmin = widget.initialIsAdmin;
    if (widget.initialPlayers != null && widget.initialPlayers!.isNotEmpty) {
      final byId = {for (final p in widget.initialPlayers!) p.id: p};
      if (widget.initialSelf != null) {
        byId[widget.initialSelf!.id] = widget.initialSelf!;
      }
      _players = byId.values.toList();
    } else if (widget.initialSelf != null) {
      _players = [widget.initialSelf!];
    }
    if (widget.initialMapName != null && widget.initialMapName!.isNotEmpty) {
      _mapName = widget.initialMapName!;
    }
    if (widget.initialMode != null && widget.initialMode!.isNotEmpty) {
      _mode = widget.initialMode!;
    }
    if (widget.initialAvailability != null &&
        widget.initialAvailability!.isNotEmpty) {
      _availability = widget.initialAvailability!;
    }
    if (widget.initialEntryFee != null) {
      _entryFee = widget.initialEntryFee!;
    }
    _initializeUsername();
    _service.seedInitialInfo(
      mapName: _mapName,
      mode: _mode,
      availability: _availability,
    );
    _service.initialize();
    _bindToService();

    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) {
        _service.requestRoomInfo();
      }
    });
  }

  Future<void> _initializeUsername() async {
    final profile = await AuthService().getCurrentUserProfile();
    final user = FirebaseAuth.instance.currentUser;
    final name = profile?.username ?? user?.email ?? 'Player';
    if (mounted) setState(() => _username = name);
  }

  // We calculate the card widths dynamically based on the number of players.
  (double minW, double maxW) _cardWidthsForCount(int count) {
    double base;
    if (count <= 4) {
      base = 220;
    } else if (count == 5) {
      base = 176;
    } else if (count == 6) {
      base = 147;
    } else {
      base = 147;
    }
    final double maxW = base;
    final double minW = (base - 20).clamp(120, base).toDouble();
    return (minW, maxW);
  }

  Challenge? getChallenge() {
    for (final player in _players) {
      if (player.id == SocketService.I.id) {
        return player.assignedChallenge;
      }
    }
    print('failure to find player challenge');
    return ChallengesConstants().fakeChallenge;
  }

  @override
  void dispose() {
    // Cancel subscriptions
    _playersSub?.cancel();
    _adminSub?.cancel();
    _lockedSub?.cancel();
    _mapNameSub?.cancel();
    _modeSub?.cancel();
    _availabilitySub?.cancel();
    _startSub?.cancel();
    _kickSub?.cancel();
    _deletedSub?.cancel();
    _dropInSub?.cancel();
    _entryFeeSub?.cancel();
    // Inform server if user leaves the waiting page
    if (!_hasLeftRoom) {
      _service.leaveRoom();
      _hasLeftRoom = true;
    }
    _service.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        if (!_hasLeftRoom) {
          _service.leaveRoom();
          _hasLeftRoom = true;
        }
        return true; // allow pop after notifying server
      },
      child: Scaffold(
        body: ThemedBackground(
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Stack(
                    children: [
                      AppHeader(
                        title: '',
                        titleStyle: const TextStyle(
                          fontFamily: FontFamily.PAPYRUS,
                          color: Colors.white,
                          fontSize: 44,
                          fontWeight: FontWeight.w900,
                        ),
                        onBack: () {
                          if (!_hasLeftRoom) {
                            _service.leaveRoom();
                            _hasLeftRoom = true;
                          }
                          Navigator.of(context).maybePop();
                        },
                        showRankings: false,
                        showShop: false,
                        showSettings: false,
                        showLogout: false,
                      ),
                      Positioned.fill(
                        child: IgnorePointer(
                          ignoring: true,
                          child: Align(
                            alignment: Alignment.center,
                            child: Transform.translate(
                              offset: const Offset(-8, 0),
                              child: Text(
                                widget.roomCode,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontFamily: FontFamily.PAPYRUS,
                                  color: Colors.white,
                                  fontSize: 44,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Colors.white, height: 16, thickness: 1),
                  WaitingHeader(
                    roomCode: widget.roomCode,
                    mapName: _mapName,
                    mode: _mode,
                    availability: _availability,
                    entryFee: _entryFee,
                    showBotAction: _isAdmin,
                    onAddBot: _onAddBotPressed,
                    isLocked: _isLocked,
                    canToggleLock: _isAdmin,
                    onLockChanged: _isAdmin
                        ? (v) async {
                            final ok = _service.changeLock(v);
                            if (!ok) {
                              await AppDialogs.showInfo(
                                context: context,
                                title: 'WAITING_PAGE.MAX_PLAYERS_CANT_UNLOCK'
                                    .tr(),
                                message: 'WAITING_PAGE.MAX_PLAYERS_CANT_UNLOCK'
                                    .tr(),
                                barrierDismissible: false,
                              );
                            }
                          }
                        : null,
                    dropInEnabled: _dropInEnabled,
                    initialQuickElimination: _quickElimination,
                    onDropInChanged: (value) {
                      setState(() {
                        _service.changeDropIn(value);
                      });
                    },
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Chat panel moved to the LEFT
                              Flexible(
                                flex: 2,
                                child: ClipRRect(
                                  borderRadius: const BorderRadius.only(
                                    topLeft: Radius.circular(20),
                                    topRight: Radius.circular(20),
                                  ),
                                  child: SizedBox(
                                    height: double.infinity,
                                    child: WaitingChat(
                                      roomCode: widget.roomCode,
                                      username: _username,
                                      compact: true,
                                      reactionsGrid: true,
                                      reactionsGridColumns: 2,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              // Players area in the middle/right
                              Expanded(
                                flex: 7,
                                child: Builder(
                                  builder: (context) {
                                    final (minW, maxW) = _cardWidthsForCount(
                                      _players.length,
                                    );
                                    final row = LobbyPlayersRow(
                                      players: _players,
                                      isAdmin: _isAdmin,
                                      currentPlayerId: SocketService.I.id,
                                      minCardWidth: minW,
                                      maxCardWidth: maxW,
                                      onKick: (player) {
                                        if (player.id == SocketService.I.id)
                                          return;
                                        _service.kick(
                                          player.id,
                                          isBot: player.isBot,
                                        );
                                      },
                                    );
                                    // If there is only one player, adjust positioning
                                    return (_players.length == 1)
                                        ? Transform.translate(
                                            offset: const Offset(-145, 0),
                                            child: row,
                                          )
                                        : row;
                                  },
                                ),
                              ),
                            ],
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: ChallengeCard(
                              challenge:
                                  getChallenge() ??
                                  ChallengesConstants().fakeChallenge,
                              currentValue: 0,
                            ),
                          ),
                          // Admin controls (start button) remain at bottom center
                          if (_isAdmin)
                            Align(
                              alignment: Alignment.bottomCenter,
                              child: AdminControls(
                                onStartGame: () {
                                  if (_players.length < 2) {
                                    AppDialogs.showInfo(
                                      context: context,
                                      title: 'DIALOG.TITLE.START_GAME'.tr(),
                                      message:
                                          'DIALOG.MESSAGE.NOT_ENOUGH_PLAYERS'
                                              .tr(namedArgs: {'min': '2'}),
                                      barrierDismissible: false,
                                    );
                                    return;
                                  }
                                  if (!_isLocked) {
                                    AppDialogs.showInfo(
                                      context: context,
                                      title: 'DIALOG.TITLE.START_GAME'.tr(),
                                      message: 'DIALOG.MESSAGE.ROOM_LOCKED'
                                          .tr(),
                                      barrierDismissible: false,
                                    );
                                    return;
                                  }
                                  _service.startGame();
                                },
                                startButtonFontSize: 20,
                                horizontalAlignment: MainAxisAlignment.center,
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
        ),
      ),
    );
  }
}
