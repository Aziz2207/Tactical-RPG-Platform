import 'dart:async';

import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/screens/game/turn-action.dart';
import 'package:client_leger/services/game/game-room-service.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class TurnActions extends StatefulWidget {
  final GameRoomService gameRoomService;
  final int? timeRemainingBeforeTurn;
  const TurnActions({
    super.key,
    required this.gameRoomService,
    this.timeRemainingBeforeTurn,
  });

  @override
  State<TurnActions> createState() => _TurnActionsState();
}

class _TurnActionsState extends State<TurnActions> {
  StreamSubscription? _isActivePlayerSub;
  StreamSubscription? _activePlayerSub;
  StreamSubscription? _isDoorAroundSub;
  StreamSubscription? _isDoorToggledSub;
  // COMBAT STREAM_SUBSCRIPTION
  StreamSubscription? _isPlayerAroundSub;
  StreamSubscription? _isCombatToggledSub;

  bool isDoorActionSelected = false;
  bool isCombatActionSelected = false;
  bool isPlayerActive = false;
  bool isDoorAround = false;
  bool isPlayerAround = false;
  Player? activePlayer;

  void _bindToGameRoomService() {
    _isDoorToggledSub = widget.gameRoomService.isDoorToggled$.listen((_) {
      if (mounted) {
        setState(() {
          isDoorActionSelected = widget.gameRoomService.isDoorActionSelected();
        });
      }
    });

    _isCombatToggledSub = widget.gameRoomService.isActionAttackToggled$.listen((
      _,
    ) {
      if (mounted) {
        setState(() {
          isCombatActionSelected = widget.gameRoomService
              .isCombatActionSelected();
        });
      }
    });

    _isActivePlayerSub = widget.gameRoomService.isActivePlayer$.listen((
      isActivePlayer,
    ) {
      if (mounted)
        setState(() {
          isPlayerActive = isActivePlayer;
        });
    });

    _activePlayerSub = widget.gameRoomService.activePlayer$.listen((
      activePlayer,
    ) {
      if (mounted) {
        setState(() {
          this.activePlayer = activePlayer;
        });
      }
    });

    _isDoorAroundSub = widget.gameRoomService.isDoorAround$.listen((
      doorAround,
    ) {
      if (mounted) {
        setState(() {
          isDoorAround = doorAround;
        });
      }
    });

    _isPlayerAroundSub = widget.gameRoomService.isAttackAround$.listen((
      isAttackAround,
    ) {
      if (mounted) {
        setState(() {
          isPlayerAround = isAttackAround;
        });
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _bindToGameRoomService();
  }

  @override
  void dispose() {
    _isActivePlayerSub?.cancel();
    _activePlayerSub?.cancel();
    _isDoorAroundSub?.cancel();
    _isDoorToggledSub?.cancel();
    _isPlayerAroundSub?.cancel();
    _isCombatToggledSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDisabledBecauseOfPopup =
        (widget.timeRemainingBeforeTurn != null &&
        widget.timeRemainingBeforeTurn! > 0);

    final hasActionPoints =
        activePlayer != null &&
        widget.gameRoomService.hasActionPoints(activePlayer!);

    return Padding(
      padding: EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow:
                  isDoorActionSelected &&
                      isPlayerActive &&
                      widget.timeRemainingBeforeTurn == 0
                  ? [
                      BoxShadow(
                        color: Colors.redAccent.withOpacity(0.8),
                        blurRadius: 4.5,
                        spreadRadius: 2.8,
                        offset: const Offset(0, 11),
                      ),
                    ]
                  : [],
            ),
            child: TurnAction(
              actionText: 'GAME.ACTIONS.DOOR'.tr(),
              enabled:
                  isPlayerActive &&
                  !isDisabledBecauseOfPopup &&
                  isDoorAround &&
                  hasActionPoints,
              imagePath: 'assets/images/icones/door-button.jpg',
              onTap: () {
                if (!isPlayerActive) return;
                widget.gameRoomService.toggleActionDoorSelected();
              },
            ),
          ),

          const SizedBox(width: 10),
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow:
                  isCombatActionSelected &&
                      isPlayerActive &&
                      widget.timeRemainingBeforeTurn == 0
                  ? [
                      BoxShadow(
                        color: Colors.redAccent.withOpacity(0.8),
                        blurRadius: 4.5,
                        spreadRadius: 2.8,
                        offset: const Offset(0, 11),
                      ),
                    ]
                  : [],
            ),
            child: TurnAction(
              actionText: 'GAME.ACTIONS.ATTACK'.tr(),
              imagePath: 'assets/images/icones/action.png',
              enabled:
                  isPlayerActive &&
                  !isDisabledBecauseOfPopup &&
                  isPlayerAround &&
                  hasActionPoints,
              onTap: () {
                if (!isPlayerActive) return;
                widget.gameRoomService.toggleActionCombatSelected();
              },
            ),
          ),
          const SizedBox(width: 10),
          TurnAction(
            actionText: 'GAME.ACTIONS.END_TURN'.tr(),
            enabled: isPlayerActive && !isDisabledBecauseOfPopup,
            imagePath: 'assets/images/icones/next-turn.png',
            onTap: () =>
                isPlayerActive ? widget.gameRoomService.emitFinishTurn() : null,
          ),
        ],
      ),
    );
  }
}
