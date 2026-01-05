import 'dart:async';

import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/models/post_game_attribute.dart';
import 'package:client_leger/screens/game/turn-actions.dart';
import 'package:client_leger/screens/menu/menu.dart';
import 'package:client_leger/screens/post-game-lobby/post-game-lobby.dart';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:client_leger/services/challenge/challenge_service.dart';
import 'package:client_leger/services/game/game-room-service.dart';
import 'package:client_leger/utils/constants/challenges/challenges-list.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/challenge-card/challenge-card.dart';
import 'package:client_leger/widgets/combat/combat-in-progress.dart';
import 'package:client_leger/widgets/dialogs/generic-two-buttons-dialog.dart';
import 'package:client_leger/widgets/post-game/end_game_winner_dialog.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/widgets/time-turn-dialog/circular_timer_turn.dart';
import 'package:client_leger/widgets/waiting/waiting_chat.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/screens/game/game-grid.dart';
import 'package:client_leger/screens/game/timer.dart';
import 'package:client_leger/screens/game/player-info-inventory.dart';
import 'package:client_leger/screens/game/ingame-player-sidebar.dart';
import 'package:easy_localization/easy_localization.dart';

class Game extends StatefulWidget {
  final Map<String, dynamic>? room;
  final String accesCode;
  final GameRoomService gameRoomService;
  const Game({
    super.key,
    this.room,
    required this.gameRoomService,
    required this.accesCode,
  });

  @override
  State<Game> createState() => _GameState();
}

class _GameState extends State<Game> {
  StreamSubscription? _isActivePlayerSub;
  StreamSubscription? _timeRemainingSub;
  StreamSubscription? _otherPlayerSub;
  StreamSubscription? _endGameSub;
  StreamSubscription? _forceEndGameSub;
  StreamSubscription? _roomSub;

  bool isActivePlayer = false;
  int? timeRemaining;
  String? otherPlayerTurnName;
  String _username = '';
  @override
  void initState() {
    super.initState();
    _initializeUsername();
    _bindToGameRoomService();
    _handleEndGame();
  }

  Future<void> _initializeUsername() async {
    final profile = await AuthService().getCurrentUserProfile();
    final user = FirebaseAuth.instance.currentUser;
    final name = profile?.username ?? user?.email ?? 'Player';
    if (mounted) setState(() => _username = name);
  }

  void _bindToGameRoomService() {
    _timeRemainingSub = widget.gameRoomService.timeBeforeTurn$.listen((
      timeBeforeTurn,
    ) {
      if (mounted)
        setState(() {
          timeRemaining = timeBeforeTurn;
        });
    });

    _otherPlayerSub = widget.gameRoomService.otherPlayerName$.listen((
      otherPlayerName,
    ) {
      if (mounted)
        setState(() {
          otherPlayerTurnName = otherPlayerName;
        });
    });

    _roomSub = widget.gameRoomService.room$.listen((updatedRoom) {
      if (!mounted || updatedRoom == null) return;

      setState(() {
        updatedRoom.forEach((key, value) {
          widget.room?[key] = value;
        });
      });
    });

    _isActivePlayerSub = widget.gameRoomService.isActivePlayer$.listen((
      isPlayerActive,
    ) {
      if (mounted)
        setState(() {
          isActivePlayer = isPlayerActive;
        });
    });
  }

  @override
  void dispose() {
    _isActivePlayerSub?.cancel();
    _timeRemainingSub?.cancel();
    _otherPlayerSub?.cancel();
    _roomSub?.cancel();
    _endGameSub?.cancel();
    _forceEndGameSub?.cancel();
    widget.gameRoomService.dispose();
    super.dispose();
  }

  void _handleEndGame() {
    _endGameSub = widget.gameRoomService.endGame$.listen((endGameData) {
      _showEndGameDialog(endGameData);
    });
  }

  void _showEndGameDialog(Map<String, dynamic> endGameData) {
    int dialogsCount = widget.gameRoomService.activeDialogsCount;

    if (dialogsCount >= 1) {
      Future.delayed(Duration(milliseconds: 3200), () {
        showEndGameWinnerDialog(
          context,
          endGameData: endGameData,
          onClose: () => _navigateToPostGameLobby(endGameData),
        );
      });
    } else {
      showEndGameWinnerDialog(
        context,
        endGameData: endGameData,
        onClose: () => _navigateToPostGameLobby(endGameData),
      );
    }
  }

  void _navigateToPostGameLobby(Map<String, dynamic> endGameData) {
    if (!widget.gameRoomService.isDisposed) {
      widget.gameRoomService.dispose();
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => PostGameLobby(
          gameRoomService: widget.gameRoomService,
          postGameAttributes: getPlayerStatAttributes(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isKeyboardVisible = MediaQuery.of(context).viewInsets.bottom > 0;
    final hideSidePanels = isKeyboardVisible;

    return Scaffold(
      body: ThemedBackground(
        child: Row(
          children: [
            Expanded(
              flex: 25,
              child: Column(
                children: [
                  const SizedBox(height: 20),

                  if (!hideSidePanels)
                    PlayerInfoInventory(
                      gameRoomService: widget.gameRoomService,
                      room: widget.room,
                    ),
                  Flexible(
                    fit: FlexFit.loose,
                    child: Container(
                      margin: const EdgeInsets.only(
                        top: 20,
                        left: 10,
                        right: 10,
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            return SizedBox(
                              height: constraints.maxHeight,
                              child: WaitingChat(
                                roomCode: widget.room!["roomId"] ?? "",
                                username: _username,
                                compact: true,
                                reactionsGrid: true,
                                reactionsGridColumns: 2,
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),

                  // Themed Quit Button
                  Builder(
                    builder: (context) {
                      final palette = ThemeConfig.palette.value;
                      return Container(
                        height: 30,
                        width: 300,
                        margin: const EdgeInsets.only(
                          top: 30,
                          left: 10,
                          right: 10,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: palette.primaryGradientColors,
                            stops: palette.primaryGradientStops,
                          ),
                          border: Border.all(
                            color: palette.primary,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: [
                            BoxShadow(
                              color: palette.primaryBoxShadow,
                              blurRadius: 8,
                              offset: const Offset(0, 0),
                              spreadRadius: 1,
                            ),
                            const BoxShadow(
                              color: Color.fromRGBO(0, 0, 0, 0.8),
                              blurRadius: 4,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(25),
                            onTap: () async {
                              final result =
                                  await showGenericConfirmationDialog(
                                context: context,
                                title: 'DIALOG.TITLE.QUIT_GAME'.tr(),
                                message: "DIALOG.MESSAGE.QUIT_GAME".tr(),
                                confirmText: "DIALOG.QUIT".tr(),
                                cancelText: "DIALOG.STAY".tr(),
                              );

                              // TODO: RAJOUTER SI LE PLAYER EST ADMIN COMME LOURD

                              if (result == true) {
                                widget.gameRoomService.dispose();
                                widget.gameRoomService.socket.disconnect();
                                Navigator.of(context).pushAndRemoveUntil(
                                  MaterialPageRoute(
                                    builder: (context) => const MenuPage(),
                                  ),
                                  (route) => false,
                                );
                                // Déconnexion socket + navigation
                              }
                            },
                            child: Container(
                              alignment: Alignment.center,
                              child: Text(
                                "DIALOG.TITLE.QUIT_GAME".tr(),
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontFamily: 'Papyrus',
                                  fontWeight: FontWeight.bold,
                                  shadows: [
                                    const Shadow(
                                      blurRadius: 3.0,
                                      color: Color.fromRGBO(0, 0, 0, 0.8),
                                      offset: Offset(1.0, 1.0),
                                    ),
                                    Shadow(
                                      blurRadius: 8.0,
                                      color: palette.primaryBoxShadow,
                                      offset: const Offset(0.0, 0.0),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),

            Expanded(
              flex: 50,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 30),
                    child: GameGrid(
                      room: widget.room,
                      gameRoomService: widget.gameRoomService,
                    ),
                  ),
                  CircularTimerTurn(
                    timeRemaining: timeRemaining ?? 0,
                    isCurrentPlayer: isActivePlayer,
                    activePlayerName:
                        otherPlayerTurnName ??
                        _fallbackActivePlayerName(widget.room) ??
                        widget.gameRoomService.otherPlayerName,
                    isDropIn: widget.gameRoomService.isDropIn,
                    dropInModalCount: widget.gameRoomService.dropInModalCount,

                    onDropInModalShown: () {
                      widget.gameRoomService.dropInModalCount++;
                    },
                  ),
                ],
              ),
            ),

            Expanded(
              flex: 25,
              child: Container(
                width: double.infinity,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    StreamBuilder<bool>(
                      stream: widget.gameRoomService.combatInProgress$,
                      initialData: false,
                      builder: (context, snapshot) {
                        final combatActive = snapshot.data ?? false;

                        return AnimatedSwitcher(
                          duration: const Duration(milliseconds: 250),
                          child: combatActive
                              ? const CombatInProgressIndicator()
                              : CircularTimerWidget(
                                  totalTimeInSeconds: 30,
                                  gameRoomService: widget.gameRoomService,
                                ),
                        );
                      },
                    ),
                    if (!hideSidePanels)
                      StreamBuilder<List<Player>?>(
                        stream: widget.gameRoomService.listPlayers$,
                        builder: (context, snapshot) {
                          final localPlayer = widget.gameRoomService
                              .getLocalPlayer();
                          final challenge =
                              localPlayer?.assignedChallenge ??
                              ChallengesConstants().fakeChallenge;
                          final currentValue =
                              ChallengeService.getChallengeValue(localPlayer);

                          return ChallengeCard(
                            challenge: challenge,
                            currentValue: currentValue,
                          );
                        },
                      ),

                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (!hideSidePanels)
                          IngamePlayerSidebar(
                            gameRoomService: widget.gameRoomService,
                            room: widget.room,
                          ),
                        TurnActions(
                          gameRoomService: widget.gameRoomService,
                          timeRemainingBeforeTurn: timeRemaining,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

List<PostGameAttribute> getPlayerStatAttributes() {
  return [
    PostGameAttribute(
      id: '1',
      key: 'combats',
      displayText: 'POST_GAME_LOBBY.STATS.COMBATS',
    ),
    PostGameAttribute(
      id: '2',
      key: 'wdl',
      displayText: 'POST_GAME_LOBBY.STATS.VICTORIES',
      isGrouped: true,
      groupKeys: ['victories', 'draws', 'defeats'],
    ),
    PostGameAttribute(
      id: '5',
      key: 'damageDealt',
      displayText: 'POST_GAME_LOBBY.STATS.DMG_DEALT',
    ),
    PostGameAttribute(
      id: '6',
      key: 'damageTaken',
      displayText: 'POST_GAME_LOBBY.STATS.DMG_TAKEN',
    ),
    PostGameAttribute(
      id: '7',
      key: 'itemsObtained',
      displayText: 'POST_GAME_LOBBY.STATS.DMG_TAKEN',
    ),
    PostGameAttribute(
      id: '8',
      key: 'tilesVisited',
      displayText: 'POST_GAME_LOBBY.STATS.PCT_TILES_VISITED',
    ),
  ];
}

String? _fallbackActivePlayerName(Map<String, dynamic>? room) {
  if (room == null) return null;

  final list = room["listPlayers"];
  if (list is List) {
    for (final p in list) {
      if (p is Map<String, dynamic> && p["isActive"] == true) {
        return p["name"] as String?;
      }
    }
  }
  return null;
}