import 'dart:async';

import 'package:client_leger/interfaces/action-data.dart';
import 'package:client_leger/interfaces/attributes.dart';
import 'package:client_leger/interfaces/game-objects.dart';
import 'package:client_leger/interfaces/item-swap.dart';
import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/interfaces/position.dart';
import 'package:client_leger/interfaces/start-fight.dart';
import 'package:client_leger/services/combat/combat.dart';

import 'package:client_leger/services/socket/socket_service.dart';
import 'package:client_leger/utils/constants/item-info/item-info.dart';
// import 'package:client_leger/utils/enums/item-type.dart';
import 'package:client_leger/utils/enums/tile-type.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:rxdart/subjects.dart';

class GameRoomService {
  final STARTING_TIME = 3;
  Position? position;
  final socket = SocketService.I;
  bool isMoving = false;
  // bool turnAlreadyStarted = false;
  // bool isActionCombatSelected = false;
  bool isDoorAround = false;
  bool isDisposed = false;
  bool isPlayerAround = false;
  bool timerLocked = false;
  final bool isDropIn;
  int _activeInfoDialogs = 0;

  GameRoomService({this.isDropIn = false});
  int dropInModalCount = 0;

  CombatService? combatService;

  final _roomCtrl = StreamController<Map<String, dynamic>?>.broadcast();
  final BehaviorSubject<List<dynamic>> _itemsPlacementCtrl =
      BehaviorSubject<List<dynamic>>();
  final BehaviorSubject<List<dynamic>> _tilesGridCtrl =
      BehaviorSubject<List<dynamic>>();
  final BehaviorSubject<List<Position>> _reachableTilesCtrl =
      BehaviorSubject<List<Position>>.seeded([]);
  final BehaviorSubject<List<Position>> _doorsTargetCtrl =
      BehaviorSubject<List<Position>>.seeded([]);
  final BehaviorSubject<List<Position>> _pathCtrl =
      BehaviorSubject<List<Position>>.seeded([]);
  final BehaviorSubject<bool> _isMovingCtrl = BehaviorSubject<bool>.seeded(
    false,
  );

  final BehaviorSubject<int> _timeBeforeTurnCtrl = BehaviorSubject<int>.seeded(
    3,
  );
  final BehaviorSubject<int> _timeCtrl = BehaviorSubject<int>();

  final BehaviorSubject<Player> _activePlayerCtrl = BehaviorSubject<Player>();
  final BehaviorSubject<bool> _doorAroundCtrl = BehaviorSubject<bool>();
  final BehaviorSubject<bool> _isActionDoorToggledCtrl =
      BehaviorSubject<bool>.seeded(false);
  final BehaviorSubject<ItemSwapEvent?> _itemSwapModalCtrl =
      BehaviorSubject<ItemSwapEvent?>.seeded(null);

  final _otherPlayerTurnCtrl = StreamController<String>.broadcast();
  final _endGameController = StreamController<Map<String, dynamic>>.broadcast();

  // NOT USED YET (1 AFTER)
  final _positionActivePlayerCtrl = StreamController<Position?>.broadcast();

  final BehaviorSubject<List<Player>?> _listPlayerCtrl =
      BehaviorSubject<List<Player>?>();
  final _isActivePlayerCtrl = BehaviorSubject<bool>();
  Stream<ItemSwapEvent?> get itemSwapModal$ => _itemSwapModalCtrl.stream;

  // COMBAT BEHAVIOR SUBJECT
  final BehaviorSubject<bool> _attackAroundCtrl = BehaviorSubject<bool>();
  final BehaviorSubject<List<Player>> _playerAroundCtrl =
      BehaviorSubject<List<Player>>.seeded([]);
  final BehaviorSubject<bool> _combatInProgressCtrl =
      BehaviorSubject<bool>.seeded(false);
  final BehaviorSubject<bool> _isActionAttackToggledCtrl =
      BehaviorSubject<bool>.seeded(false);
  final BehaviorSubject<bool> _isInCombatCtrl = BehaviorSubject<bool>.seeded(
    false,
  );
  final BehaviorSubject<Player?> _firstCombatPlayerCtrl =
      BehaviorSubject<Player?>.seeded(null);

  final BehaviorSubject<Player?> _opponentPlayerCtrl =
      BehaviorSubject<Player?>.seeded(null);

  Stream<Map<String, dynamic>?> get room$ => _roomCtrl.stream;
  Stream<int> get time$ => _timeCtrl.stream;
  Stream<int> get timeBeforeTurn$ => _timeBeforeTurnCtrl.stream;
  Stream<List<Player>?> get listPlayers$ => _listPlayerCtrl.stream;
  Stream<bool> get isActivePlayer$ => _isActivePlayerCtrl.stream;
  Stream<bool> get isMoving$ => _isMovingCtrl.stream;
  Stream<bool> get isDoorAround$ => _doorAroundCtrl.stream;
  Stream<bool> get isDoorToggled$ => _isActionDoorToggledCtrl.stream;
  Stream<String> get otherPlayerName$ => _otherPlayerTurnCtrl.stream;
  Stream<List<dynamic>> get tilesGrid$ => _tilesGridCtrl.stream;

  Stream<Player> get activePlayer$ => _activePlayerCtrl.stream;
  Stream<dynamic> get itemsPlacement$ => _itemsPlacementCtrl.stream;
  Stream<Position?> get activePlayerPosition$ =>
      _positionActivePlayerCtrl.stream;
  Stream<List<Position>> get reachableTiles$ => _reachableTilesCtrl.stream;
  Stream<List<Position>> get doorsTarget$ => _doorsTargetCtrl.stream;
  Stream<List<Position>> get path$ => _pathCtrl.stream;
  Stream<Map<String, dynamic>> get endGame$ => _endGameController.stream;

  // COMBAT STREAM
  Stream<bool> get isAttackAround$ => _attackAroundCtrl.stream;
  Stream<List<Player>> get playerAroundTargets$ => _playerAroundCtrl.stream;
  Stream<bool> get isActionAttackToggled$ => _isActionAttackToggledCtrl.stream;
  Stream<bool> get isInCombat$ => _isInCombatCtrl.stream;
  Stream<Player?> get actualPlayerCombat$ => _firstCombatPlayerCtrl.stream;
  Stream<Player?> get opponentPlayer$ => _opponentPlayerCtrl.stream;
  Stream<bool> get combatInProgress$ => _combatInProgressCtrl.stream;

  String otherPlayerName = "";
  Map<String, dynamic>? currentRoom;

  void initialize() {
    socket.connect().then((_) {
      socket.on("mapInformation", (data) {
        Map<String, dynamic>? room;
        if (data is Map) {
          room = Map<String, dynamic>.from(data);
          currentRoom = room;
          _roomCtrl.add(room);
          final allPlayers = _parsePlayerList(data["listPlayers"]);
          _listPlayerCtrl.add(allPlayers);
          findFirstActifPlayerName(allPlayers);

          if (data["gameMap"]?["tiles"] != null) {
            final tiles = (data["gameMap"]["tiles"] as List)
                .map((row) => List<int>.from(row))
                .toList();
            _tilesGridCtrl.add(tiles);
          }

          if (data["gameMap"]?["itemPlacement"] != null) {
            final items = (data["gameMap"]["itemPlacement"] as List)
                .map((row) => List<int>.from(row))
                .toList();
            _itemsPlacementCtrl.add(items);
          }
        }
      });
      socket.on("updateAllPlayers", (data) {
        final allPlayers = _parsePlayerList(data);
        if (allPlayers == null || allPlayers.isEmpty) return;
        _listPlayerCtrl.add(allPlayers);
        if (_activePlayerCtrl.hasValue) {
          final current = _activePlayerCtrl.value;
          final updated = allPlayers.firstWhere(
            (p) => p.id == current.id,
            orElse: () => current,
          );
          _activePlayerCtrl.add(updated);
        }
      });

      socket.on("NewPlayerDroppedIn", (data) {
        if (data is Map) {
          final room = Map<String, dynamic>.from(data);

          currentRoom = room;
          _roomCtrl.add(room);

          final allPlayers = _parsePlayerList(room["listPlayers"]);
          _listPlayerCtrl.add(allPlayers);
        }
      });

      socket.on("otherPlayerTurn", (otherPlayerName) {
        _otherPlayerTurnCtrl.add(otherPlayerName);
      });

      socket.on("beforeStartTurnTimer", (timeBeforeTurn) {
        if (timerLocked) return;
        if (timeBeforeTurn is int) _timeBeforeTurnCtrl.add(timeBeforeTurn);
      });

      socket.on("startedTurnTimer", (timeRemaining) {
        // A voir si j'enlève ça pour le combat
        // isActionCombatSelected = false;
        if (timerLocked) return;
        if (timeRemaining is int) _timeCtrl.add(timeRemaining);
      });

      socket.on("activePlayer", (activePlayer) {
        bool isPlayerActive = isActivePlayer(activePlayer);
        _isActivePlayerCtrl.add(isPlayerActive);

        if (activePlayer is Map<String, dynamic>) {
          final player = Player.fromJson(activePlayer);
          _activePlayerCtrl.add(player);
        }
      });

      // Pour l'instant , c'est de listAllPlayers qu'on get les positions temps réels.
      // Donc PAS de ce event
      socket.on("playerNavigation", (tilePosition) {
        position = Position.fromJson(tilePosition);
        _positionActivePlayerCtrl.add(position);
      });

      // socket.on("updateObjects", (itemPlacement) {
      //   _itemsPlacementCtrl.add(itemPlacement);
      // });

      socket.on("updateObjects", (rawItemPlacement) {
        if (rawItemPlacement is List) {
          final newGrid = rawItemPlacement
              .map<List<int>>((row) => List<int>.from(row))
              .toList();

          _itemsPlacementCtrl.add(newGrid);

          if (currentRoom != null && currentRoom!["gameMap"] != null) {
            currentRoom!["gameMap"]["itemPlacement"] = newGrid;
          }
        }
      });

      socket.on("updateInventory", (playerToUpdate) {
        if (playerToUpdate is Map<String, dynamic>) {
          _activePlayerCtrl.add(Player.fromJson(playerToUpdate));
        }
      });

      socket.on("playerDisconnected", (rawPlayer) {
        if (rawPlayer is Map<String, dynamic>) {
          final disconnectedPlayer = Player.fromJson(rawPlayer);

          final currentPlayers = _listPlayerCtrl.valueOrNull;

          if (currentPlayers != null) {
            final updatedList = List<Player>.from(currentPlayers)
              ..removeWhere((p) => p.uid == disconnectedPlayer.uid);

            _listPlayerCtrl.add(updatedList);
          }
        }
      });

      socket.on("openItemSwitchModal", (data) {
        final playerWithItemToSwitch = Map<String, dynamic>.from(data);

        final int foundItemId = playerWithItemToSwitch["foundItem"];

        final notFoundItemNumber = -10000;
        final GameObject foundObject = gameItems.firstWhere(
          (obj) => obj.id == foundItemId,
          orElse: () => GameObject(
            id: notFoundItemNumber,
            name: "UNKNOWN",
            image: "",
            description: "",
          ),
        );

        if (foundObject.id == notFoundItemNumber) {
          return;
        }

        _itemSwapModalCtrl.add(
          ItemSwapEvent(
            activePlayer: Player.fromJson(data["activePlayer"]),
            foundItem: foundObject,
          ),
        );
      });

      socket.on("reachableTiles", (allReachableTiles) {
        final tiles = (allReachableTiles as List)
            .map((tileJson) => Position.fromJson(tileJson))
            .toList();
        _reachableTilesCtrl.add(tiles);
      });

      socket.on("pathFound", (path) {
        final pathJson = (path as List)
            .map((p) => Position.fromJson(p))
            .toList();
        _pathCtrl.add(pathJson);
      });

      socket.on("doorAround", (data) {
        if (data is Map<String, dynamic>) {
          isDoorAround = data['doorAround'];
          _doorAroundCtrl.add(isDoorAround);
          final doorsTarget = (data['targets'] as List)
              .map((t) => Position.fromJson(t))
              .toList();
          _doorsTargetCtrl.add(doorsTarget);
        } else {
          isDoorAround = data;
          _doorAroundCtrl.add(isDoorAround);
        }
      });

      socket.on("doorClicked", (tiles) {
        if (tiles is List) {
          final parsedTiles = tiles
              .map<List<int>>((row) => List<int>.from(row))
              .toList();

          _tilesGridCtrl.add(parsedTiles);
          _isActionDoorToggledCtrl.add(false);
          if (_activePlayerCtrl.hasValue) {
            final player = _activePlayerCtrl.value;
            final currentPoints = player.attributes.actionPoints;
            if (currentPoints > 0) {
              player.attributes.actionPoints = currentPoints - 1;
              _activePlayerCtrl.add(player);
            }
          }
        }
      });

      socket.on("botNavigation", (rawPath) {
        if (rawPath is List) {
          final path = rawPath
              .map((p) => Position.fromJson(Map<String, dynamic>.from(p)))
              .toList();

          if (path.isNotEmpty) {
            socket.emit(
              "playerNavigation",
              path.map((p) => p.toJson()).toList(),
            );
          }
        }
      });

      socket.on("endMovement", (_) {
        isMoving = false;
        _isMovingCtrl.add(isMoving);
      });

      socket.on("turnEnded", (_) {
        onBeforeStartTurn();
      });

      socket.on('endGame', (data) {
        timerLocked = true;
        _endGameController.add(data);

        if (data is Map && data["room"] != null) {
          final room = Map<String, dynamic>.from(data["room"]);
          currentRoom = room;
          _roomCtrl.add(room);
        }
      });

      socket.on('drawGame', (data) {
        socket.emit("forceEndGame");
      });

      // COMBAT

      socket.on("attackAround", (data) {
        if (data is Map<String, dynamic>) {
          isPlayerAround = data['attackAround'];
          _attackAroundCtrl.add(isPlayerAround);
          final playersAroundTarget = (data['targets'] as List)
              .map((t) => Player.fromJson(t))
              .toList();
          _playerAroundCtrl.add(playersAroundTarget);
        } else {
          isPlayerAround = data;
          _attackAroundCtrl.add(isPlayerAround);
        }
      });

      socket.on("botAttack", (raw) {
        if (raw is Map<String, dynamic>) {
          final data = ActionData.fromJson(Map<String, dynamic>.from(raw));

          if (_activePlayerCtrl.hasValue &&
              _activePlayerCtrl.value.uid == data.player.uid) {
            socket.emit("combatAction", data.toJson());
          }
        }
      });

      socket.on("startFight", (startFightData) {
        final fightData = StartFightData.fromJson(
          Map<String, dynamic>.from(startFightData),
        );
        final localPlayer = getLocalPlayer();
        if (localPlayer == null) return;

        final attacker = fightData.combatPlayers.attacker;
        final defender = fightData.combatPlayers.defender;

        final bool isAttacker = attacker.uid == localPlayer.uid;
        final bool isDefender = defender.uid == localPlayer.uid;

        final bool isEliminated = localPlayer.status == "disconnected";

        final bool shouldShowModal = isAttacker || isDefender || isEliminated;

        if (!shouldShowModal) {
          return;
        }

        combatService?.dispose();
        combatService = CombatService(
          activePlayer: fightData.isActivePlayerAttacker
              ? fightData.combatPlayers.attacker
              : fightData.combatPlayers.defender,
          opponent: fightData.isActivePlayerAttacker
              ? fightData.combatPlayers.defender
              : fightData.combatPlayers.attacker,
          gameRoomService: this,
          isLocalPlayerEliminated: isEliminated,
        );

        if (combatService != null) {
          combatService!.initSocketListeners();
          combatService!.initializeCombat(
            fightData.combatPlayers,
            fightData.isActivePlayerAttacker,
          );
          _isInCombatCtrl.add(true);
          if (_activePlayerCtrl.hasValue) {
            final player = _activePlayerCtrl.value;
            final currentPoints = player.attributes.actionPoints;
            if (currentPoints > 0) {
              final newPoints = currentPoints - 1;
              player.attributes.actionPoints = newPoints;
              _activePlayerCtrl.add(player);
            }
          }
          _isActionAttackToggledCtrl.add(false);
          // _firstCombatPlayerCtrl.add()
        }
      });

      socket.on("combatInProgress", (data) {
        _combatInProgressCtrl.add(true);
      });

      socket.on("combatOver", (data) {
        _combatInProgressCtrl.add(false);
      });

      socket.on("updateObjectsAfterCombat", (raw) {
        if (raw is Map<String, dynamic>) {
          final data = Map<String, dynamic>.from(raw);

          final List<List<int>> newGrid = (data["newGrid"] as List)
              .map((row) => List<int>.from(row))
              .toList();

          _itemsPlacementCtrl.add(newGrid);
        }
      });
    });
  }

  void emitFinishTurn() {
    socket.emit("endTurn");
  }

  void onBeforeStartTurn() {
    socket.emit("startTurn");
  }

  void setCombatState(bool inCombat) {
    _isInCombatCtrl.add(inCombat);
  }

  void setListPlayerState(List<Player> listAllPlayers) {
    _listPlayerCtrl.add(listAllPlayers);
  }

  void setActivePlayer(Player player) {
    _activePlayerCtrl.add(player);
  }

  void findFirstActifPlayerName(List<Player>? allPlayers) {
    if (allPlayers != null && allPlayers.isNotEmpty) {
      final active = allPlayers.firstWhere(
        (p) => p.isActive == true,
        orElse: () => Player(
          id: '',
          isActive: false,
          name: '',
          attributes: Attributes.empty(),
          inventory: [],
          position: Position(x: 0, y: 0),
          positionHistory: [],
          collectedItems: [],
          spawnPosition: Position(x: 0, y: 0),
        ),
      );
      if (active.name.isNotEmpty) {
        _otherPlayerTurnCtrl.add(active.name);
        otherPlayerName = active.name;
      }
    }
  }

  void emitSendNavigation(List<Position>? path) {
    if (path == null || path.isEmpty) {
      return;
    }

    final serialized = path.map((p) => p.toJson()).toList();
    socket.emit("playerNavigation", serialized);
  }

  void emitFindPath(int row, int col) {
    socket.emit("findPath", {"x": row, "y": col});
  }

  bool isInCombat() {
    return _isInCombatCtrl.value;
  }

  bool isActivePlayer(dynamic player) {
    final selfUid = FirebaseAuth.instance.currentUser?.uid;
    if (player is Map<String, dynamic> && player["uid"] != null) {
      return player["uid"] == selfUid;
    } else if (player is Player && player.uid != null) {
      return player.uid == selfUid;
    }
    return false;
  }

  List<Player>? _parsePlayerList(dynamic data) {
    if (data is List) {
      return data.map((p) {
        try {
          final playerMap = Map<String, dynamic>.from(p as Map);
          return Player.fromJson(playerMap);
        } catch (e) {
          return Player(
            id: '',
            isActive: false,
            name: '',
            attributes: Attributes.empty(),
            inventory: [],
            position: Position(x: 0, y: 0),
            positionHistory: [],
            collectedItems: [],
            spawnPosition: Position(x: 0, y: 0),
          );
        }
      }).toList();
    }
    return null;
  }

  Player? getLocalPlayer() {
    final firebaseUid = FirebaseAuth.instance.currentUser?.uid;
    if (firebaseUid == null) return null;

    final players = _listPlayerCtrl.valueOrNull;
    if (players == null || players.isEmpty) return null;

    try {
      return players.firstWhere((player) => player.uid == firebaseUid);
    } catch (_) {
      return null;
    }
  }

  bool canOpenDoor(Player player) {
    return _isActionDoorToggledCtrl.value && hasActionPoints(player);
  }

  bool canStartCombat(Player player) {
    return _isActionAttackToggledCtrl.value && hasActionPoints(player);
  }

  bool hasActionPoints(Player player) {
    // return player.attributes["actionPoints"] > 0;
    return player.attributes.actionPoints > 0;
  }

  bool isReachableTile(List<Position>? reachableTiles, int row, int col) {
    if (reachableTiles == null) return false;
    return reachableTiles.any((tile) => tile.x == row && tile.y == col);
  }

  bool handleTileClick(
    Position position,
    Player activePlayer,
    List<dynamic> tiles,
  ) {
    if (canOpenDoor(activePlayer)) {
      socket.emit("doorAction", {
        'clickedPosition': position.toJson(),
        'player': activePlayer.toJson(),
      });
      return false;
    } else if (canStartCombat(activePlayer)) {
      socket.emit("combatAction", {
        'clickedPosition': position.toJson(),
        'player': activePlayer.toJson(),
      });
      return false;
    } else if (!isInteractionPossible(position, tiles, activePlayer)) {
      return true;
    }
    return false;
  }

  bool isActionSelected() {
    return _isActionDoorToggledCtrl.value || _isActionAttackToggledCtrl.value;
  }

  bool isDoorActionSelected() {
    return _isActionDoorToggledCtrl.value;
  }

  bool isCombatActionSelected() {
    return _isActionAttackToggledCtrl.value;
  }

  void toggleActionDoorSelected() {
    final current = _isActionDoorToggledCtrl.value;
    _isActionDoorToggledCtrl.add(!current);
    _isActionAttackToggledCtrl.add(false);
  }

  void toggleActionCombatSelected() {
    final current = _isActionAttackToggledCtrl.value;
    _isActionAttackToggledCtrl.add(!current);
    _isActionDoorToggledCtrl.add(false);
  }

  bool isTileAClosedDoor(List<dynamic> tiles, Position position) {
    return tiles[position.x][position.y] == TileType.ClosedDoor;
  }

  bool isPlayerOnTile(Position position, Player player) {
    return player.position.x == position.x && player.position.y == position.y;
  }

  bool isInteractionPossible(
    Position position,
    List<dynamic> tiles,
    Player player,
  ) {
    return isReachableTile(
          _reachableTilesCtrl.valueOrNull,
          position.x,
          position.y,
        ) &&
        isTileAClosedDoor(tiles, position) &&
        isPlayerOnTile(position, player);
  }

  void setActiveInfoDialogs(int count) {
    _activeInfoDialogs = count;
  }

  int get activeDialogsCount => _activeInfoDialogs;

  // COMBAT

  void dispose() {
    if (isDisposed) return;

    socket.off("mapInformation");
    socket.off("NewPlayerDroppedIn");
    socket.off("updateAllPlayers");
    socket.off("otherPlayerTurn");
    socket.off("beforeStartTurnTimer");
    socket.off("startedTurnTimer");
    socket.off("activePlayer");
    socket.off("playerNavigation");
    socket.off("playerDisconnected");
    socket.off("turnEnded");
    socket.off("reachableTiles");
    socket.off("pathFound");
    socket.off("endMovement");
    socket.off("updateObjects");
    socket.off("updateInventory");
    socket.off("doorAround");
    socket.off("doorClicked");
    socket.off("attackAround");
    socket.off("botAttack");
    socket.off("botNavigation");
    socket.off("startFight");
    socket.off("updateObjectsAfterCombat");
    socket.off("openItemSwitchModal");
    socket.off("drawGame");
    socket.off("endGame");
    socket.off("combatInProgress");
    socket.off("combatOver");

    isMoving = false;
    isDoorAround = false;
    isPlayerAround = false;
    _isInCombatCtrl.add(false);
    _roomCtrl.close();
    _timeCtrl.close();
    _listPlayerCtrl.close();
    _isActivePlayerCtrl.close();
    _activePlayerCtrl.close();
    _positionActivePlayerCtrl.close();
    _isMovingCtrl.close();
    _reachableTilesCtrl.close();
    _pathCtrl.close();
    _timeBeforeTurnCtrl.close();
    _otherPlayerTurnCtrl.close();
    _positionActivePlayerCtrl.close();
    _itemsPlacementCtrl.close();
    _itemSwapModalCtrl.close();
    _endGameController.close();
    _tilesGridCtrl.close();
    _isActionDoorToggledCtrl.close();
    _doorsTargetCtrl.close();
    _attackAroundCtrl.close();
    _combatInProgressCtrl.close();
    isDisposed = true;
  }
}
