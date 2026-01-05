import 'dart:async';
import 'package:client_leger/interfaces/combat-players.dart';
import 'package:client_leger/interfaces/combat-result-details.dart';
import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/models/combat/combat-ui.dart';
import 'package:client_leger/models/combat_result.dart';
import 'package:client_leger/services/game/game-room-service.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:rxdart/subjects.dart';
import 'package:easy_localization/easy_localization.dart';

class CombatService {
  final GameRoomService gameRoomService;
  Player activePlayer;
  Player opponent;
  Player? attacker;
  final bool isLocalPlayerEliminated;
  Player? defender;
  String? turnMessage;
  String combatStatus = "";
  bool canAttackOrEvade = true;
  final int combatDialogTime = 2500;
  final int dialogsWhileInCombat = 1650;

  late CombatResult attackResult;
  late CombatResult defenseResult;

  CombatResult activePlayerResult = CombatResult(total: 0, diceValue: 1);
  CombatResult opponentResult = CombatResult(total: 0, diceValue: 1);

  List<bool> evasionsActivePlayer = [true, true];
  List<bool> evasionsOpponent = [true, true];

  final socket = SocketService.I;

  // final BehaviorSubject<bool> _isInCombatCtrl = BehaviorSubject<bool>.seeded(
  //   false,
  // );
  final BehaviorSubject<bool> _isActionAttackToggledCtrl =
      BehaviorSubject<bool>.seeded(false);
  final StreamController<int> _combatTurnTimeController =
      StreamController<int>.broadcast();
  final BehaviorSubject<Player?> _activePlayerInCombatCtrl =
      BehaviorSubject<Player?>.seeded(null);
  final BehaviorSubject<String> _turnMessageCtrl =
      BehaviorSubject<String>.seeded("");
  final BehaviorSubject<CombatResultDetails?> _combatResultsDetailsCtrl =
      BehaviorSubject<CombatResultDetails?>.seeded(null);
  final BehaviorSubject<String> _combatStatusCtrl =
      BehaviorSubject<String>.seeded("");

  final BehaviorSubject<Player> _opponentCtrl = BehaviorSubject<Player>();
  final BehaviorSubject<bool> _canAttackOrEvadeCtrl =
      BehaviorSubject<bool>.seeded(false);
  final _uiEvents = StreamController<CombatUIEvent>.broadcast();

  Stream<int> get combatTurnTimeStream => _combatTurnTimeController.stream;
  Stream<bool> get isActionAttackToggled$ => _isActionAttackToggledCtrl.stream;
  Stream<Player?> get activePlayerInCombat$ => _activePlayerInCombatCtrl.stream;
  Stream<String> get turnMessage$ => _turnMessageCtrl.stream;
  Stream<CombatResultDetails?> get combatResultDetails$ =>
      _combatResultsDetailsCtrl.stream;
  Stream<String> get combatStatusMsg => _combatStatusCtrl.stream;
  Stream<Player> get opponent$ => _opponentCtrl.stream;
  Stream<bool> get canAttackOrEvade$ => _canAttackOrEvadeCtrl.stream;
  Stream<CombatUIEvent> get uiEvents => _uiEvents.stream;

  CombatService({
    required this.activePlayer,
    required this.opponent,
    required this.gameRoomService,
    required this.isLocalPlayerEliminated,
  });

  void initSocketListeners() {
    socket.connect().then((_) {
      socket.on("combatTime", (timeRemaining) {
        _combatTurnTimeController.add(timeRemaining);
      });

      socket.on("combatTurnEnded", (combatData) {
        if (combatData is Map<String, dynamic>) {
          final parsed = Map<String, dynamic>.from(combatData);

          final combatPlayersJson = parsed["combatPlayers"];
          final failEvasion = parsed["failEvasion"] ?? false;
          if (combatPlayersJson == null) {
            return;
          }

          final combatPlayers = CombatPlayers.fromJson(
            Map<String, dynamic>.from(combatPlayersJson),
          );

          onCombatTurnEnded(combatPlayers, failEvasion);
        }
      });

      socket.on("attackValues", (combatResultDetails) {
        if (combatResultDetails is Map<String, dynamic>) {
          final parsed = Map<String, dynamic>.from(combatResultDetails);
          final details = CombatResultDetails.fromJson(parsed);
          onAttackValues(details);
        }
      });

      socket.on("attackSuccess", (data) {
        if (data is Map<String, dynamic>) {
          // final parsed = Map<String, dynamic>.from(data);
          // final player = Player.fromJson(parsed);
          final parsed = Map<String, dynamic>.from(data);
          final attacker = Player.fromJson(parsed["attacker"]);
          final int damage = parsed["damage"];
          onAttackSuccess(attacker, damage);
        }
      });

      socket.on("attackFail", (data) {
        if (data is Map<String, dynamic>) {
          final parsed = Map<String, dynamic>.from(data);
          final attacker = Player.fromJson(parsed['attacker']);
          final int damage = parsed['damage'];
          final bool shouldDamageSelf = parsed['shouldDamageSelf'] ?? false;

          combatStatus = "GAME.LOGS.ATTACK_FAIL".tr(
            namedArgs: {'playerName': '${attacker.name}'},
          );
          if (shouldDamageSelf) {
            onAttackFailWithArmor(damage);
          }
          _combatStatusCtrl.add(combatStatus);
        }
      });

      socket.on("evasionFail", (player) {
        if (player is Map<String, dynamic>) {
          final p = Player.fromJson(player);
          combatStatus = "GAME.LOGS.EVADE_COMBAT_FAIL".tr(
            namedArgs: {'playerName': '${p.name}'},
          );
          final evasionsLeft = isAttacker(activePlayer)
              ? evasionsActivePlayer
              : evasionsOpponent;
          evasionsLeft.removeLast();
        }
      });

      socket.on("evasionSuccess", (data) {
        if (data is Map<String, dynamic>) {
          final listAllPlayersJson = data["listPlayers"] as List<dynamic>;
          final List<Player> listAllPlayers = listAllPlayersJson
              .map((json) => Player.fromJson(json as Map<String, dynamic>))
              .toList();

          final playerJson = data["player"] as Map<String, dynamic>;
          final player = Player.fromJson(playerJson);
          setPlayersOnCombatDone(listAllPlayers);
          _uiEvents.add(
            CombatUIEvent(
              title: "DIALOG.TITLE.SUCCESS_EVASION".tr(),
              message: "GAME.LOGS.EVADE_COMBAT_SUCCESS".tr(
                namedArgs: {'playerName': '${player.name}'},
              ),
              durationMs: dialogsWhileInCombat,
              showOkButton: false,
              closeModal: true,
            ),
          );
          gameRoomService.setCombatState(false);
          _uiEvents.add(
            CombatUIEvent(closeModal: true, durationMs: dialogsWhileInCombat),
          );
          dispose();
        }
      });

      socket.on("combatEnd", (data) {
        if (data is Map<String, dynamic>) {
          final listAllPlayersJson = data["listPlayers"] as List<dynamic>;
          final List<Player> listAllPlayers = listAllPlayersJson
              .map((json) => Player.fromJson(json as Map<String, dynamic>))
              .toList();

          final playerJson = data["player"] as Map<String, dynamic>;
          final player = Player.fromJson(playerJson);
          setPlayersOnCombatDone(listAllPlayers);
          if (gameRoomService.isInCombat()) {
            _uiEvents.add(
              CombatUIEvent(
                title: "DIALOG.TITLE.END_FIGHT".tr(),
                message: "DIALOG.MESSAGE.END_FIGHT".tr(
                  namedArgs: {'winner': '${player.name}'},
                ),
                durationMs: dialogsWhileInCombat,
                showOkButton: false,
                closeModal: true,
              ),
            );
          }
          gameRoomService.setCombatState(false);
          _uiEvents.add(
            CombatUIEvent(closeModal: true, durationMs: combatDialogTime),
          );
          dispose();
        }
      });

      socket.on("defaultCombatWin", (data) {
        gameRoomService.setCombatState(false);
        _uiEvents.add(
          CombatUIEvent(
            title: "DIALOG.TITLE.DEFAULT_FIGHT_WIN".tr(),
            message: "DIALOG.MESSAGE.DEFAULT_FIGHT_WIN".tr(),
            durationMs: dialogsWhileInCombat,
            showOkButton: false,
            closeModal: true,
          ),
        );
        _uiEvents.add(
          CombatUIEvent(closeModal: true, durationMs: combatDialogTime),
        );
        dispose();
      });

      socket.on("updateStats", (data) {
        if (data is Map<String, dynamic>) {
          final parsed = Map<String, dynamic>.from(data);
          final attacker = parsed["attacker"] ?? parsed["winner"];
          final defender = parsed["defender"] ?? parsed["loser"];

          final combatPlayers = CombatPlayers(
            attacker: Player.fromJson(attacker),
            defender: Player.fromJson(defender),
          );

          if (isAttacker(activePlayer)) {
            activePlayer.attributes.attack =
                combatPlayers.attacker.attributes.attack;
            opponent.attributes.defense =
                combatPlayers.defender.attributes.defense;

            _activePlayerInCombatCtrl.add(activePlayer);
            _opponentCtrl.add(opponent);
          } else {
            activePlayer.attributes.defense =
                combatPlayers.defender.attributes.defense;
            opponent.attributes.attack =
                combatPlayers.attacker.attributes.attack;

            _activePlayerInCombatCtrl.add(activePlayer);
            _opponentCtrl.add(opponent);
          }
        }
      });
    });
  }

  void triggerAttack() {
    if (_canAttackOrEvadeCtrl.value) {
      socket.emit("attackPlayer");
    }
    canAttackOrEvade = false;
    _canAttackOrEvadeCtrl.add(canAttackOrEvade);
  }

  void triggerEvade() {
    if (_canAttackOrEvadeCtrl.value) {
      final evaderId = socket.id;
      socket.emit("evadeCombat", evaderId);
    }
    canAttackOrEvade = false;
    _canAttackOrEvadeCtrl.add(canAttackOrEvade);
  }

  bool canAttack() {
    if (isLocalPlayerEliminated) return false;
    return isCurrentTurn() && _canAttackOrEvadeCtrl.value;
  }

  bool canEvade() {
    if (isLocalPlayerEliminated) return false;
    return isCurrentTurn() && evasionLeft() && _canAttackOrEvadeCtrl.value;
  }

  void setPlayersOnCombatDone(List<Player> listAllPlayers) {
    gameRoomService.setListPlayerState(listAllPlayers);
  }

  void initializeCombat(
    CombatPlayers combatPlayers,
    bool isActivePlayerAttacker,
  ) {
    combatPlayers.attacker.attributes.currentHp =
        combatPlayers.attacker.attributes.totalHp;

    combatPlayers.defender.attributes.currentHp =
        combatPlayers.defender.attributes.totalHp;

    activePlayer = isActivePlayerAttacker
        ? combatPlayers.attacker
        : combatPlayers.defender;
    opponent = isActivePlayerAttacker
        ? combatPlayers.defender
        : combatPlayers.attacker;

    _activePlayerInCombatCtrl.add(activePlayer);
    _opponentCtrl.add(opponent);
    attacker = combatPlayers.attacker;
    defender = combatPlayers.defender;
    gameRoomService.setCombatState(true);
    canAttackOrEvade = true;
    _canAttackOrEvadeCtrl.add(canAttackOrEvade);
    evasionsActivePlayer = [true, true];
    evasionsOpponent = [true, true];
    setTurnMessage();
  }

  void removeListeners() {
    socket.off("combatTime");
    socket.off("combatTurnEnded");
    socket.off("attackValues");
    socket.off("attackSuccess");
    socket.off("attackFail");
    socket.off("evasionFail");
    socket.off("evasionSuccess");
    socket.off("combatEnd");
    socket.off("defaultCombatWin");
    socket.off("updateStats");
  }

  void dispose() {
    removeListeners();
    _combatTurnTimeController.close();
    _combatResultsDetailsCtrl.close();
    _opponentCtrl.close();
    _activePlayerInCombatCtrl.close();
    _canAttackOrEvadeCtrl.close();
    _combatStatusCtrl.close();
    _isActionAttackToggledCtrl.close();
    _turnMessageCtrl.close();
    _uiEvents.close();
  }

  bool isAttacker(Player player) {
    if (attacker == null) return false;
    return player.id == attacker!.id;
  }

  bool evasionLeft() {
    final evasionsLeft = isAttacker(activePlayer)
        ? evasionsActivePlayer
        : evasionsOpponent;
    return evasionsLeft.isNotEmpty;
  }

  void resetPlayerHp(Player p1, Player p2) {
    p1.attributes.currentHp = p1.attributes.totalHp;
    p2.attributes.currentHp = p2.attributes.totalHp;
  }

  bool isCurrentTurn() {
    return socket.id == attacker?.id;
  }

  void onCombatTurnEnded(CombatPlayers combatPlayers, bool failEvasion) {
    attacker = combatPlayers.attacker;
    defender = combatPlayers.defender;
    canAttackOrEvade = true;
    _canAttackOrEvadeCtrl.add(canAttackOrEvade);
    setTurnMessage();
  }

  void onAttackSuccess(Player attacker, int damage) {
    if (isAttacker(activePlayer)) {
      opponent.attributes.currentHp = (opponent.attributes.currentHp - damage)
          .clamp(0, 9999);
      _opponentCtrl.add(opponent);
    } else {
      activePlayer.attributes.currentHp =
          (activePlayer.attributes.currentHp - damage).clamp(0, 9999);
      _activePlayerInCombatCtrl.add(activePlayer);
    }

    combatStatus = 'GAME.LOGS.ATTACK_SUCCESS'.tr(
      namedArgs: {'playerName': '${attacker.name}', 'damage': '$damage'},
    );
    _combatStatusCtrl.add(combatStatus);
  }

  void onAttackFailWithArmor(int damage) {
    if (isAttacker(activePlayer)) {
      activePlayer.attributes.currentHp =
          (activePlayer.attributes.currentHp - damage).clamp(0, 9999);
      _activePlayerInCombatCtrl.add(activePlayer);
    } else {
      opponent.attributes.currentHp = (opponent.attributes.currentHp - damage)
          .clamp(0, 9999);
      _opponentCtrl.add(opponent);
    }
  }

  onAttackValues(CombatResultDetails combatResultDetails) {
    canAttackOrEvade = false;
    attackResult = combatResultDetails.attackValues;
    defenseResult = combatResultDetails.defenseValues;

    _canAttackOrEvadeCtrl.add(canAttackOrEvade);
    _combatResultsDetailsCtrl.add(combatResultDetails);
  }

  isCurrentPlayer(Player player) {
    return socket.id == player.id;
  }

  setTurnMessage() {
    if (isLocalPlayerEliminated) {
      turnMessage = "GAME.COMBAT.VIEWER_TURN_START_MESSAGE".tr(
        namedArgs: {"attackerName": attacker?.name ?? ""},
      );
      _turnMessageCtrl.add(turnMessage!);
      return;
    }

    turnMessage = isCurrentTurn()
        ? "GAME.COMBAT.YOUR_TURN_START".tr()
        : "GAME.COMBAT.OPPONENT_TURN_START".tr();
    _turnMessageCtrl.add(turnMessage!);
  }
}
