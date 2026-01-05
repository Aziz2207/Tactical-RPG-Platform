import 'dart:async';

import 'package:client_leger/interfaces/game-objects.dart';
import 'package:client_leger/interfaces/item-swap.dart';
import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/interfaces/position.dart';
import 'package:client_leger/screens/game/combat-modal.dart';
import 'package:client_leger/services/combat/combat.dart';
import 'package:client_leger/services/game/game-room-service.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/constants/item-info/item-info.dart'
    show gameItems;
import 'package:client_leger/utils/constants/tile-info/tile-info.dart'
    show gameTiles;
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:client_leger/widgets/dialogs/app_swap_item_dialog.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class GameGrid extends StatefulWidget {
  final Map<String, dynamic>? room;
  final GameRoomService gameRoomService;

  const GameGrid({
    super.key,
    required this.room,
    required this.gameRoomService,
  });

  @override
  State<GameGrid> createState() => _GameGridState();
}

class _GameGridState extends State<GameGrid> {
  StreamSubscription? _isActivePlayerSub;
  StreamSubscription? _listAllPlayersSub;
  StreamSubscription? _reachableTilesSub;
  StreamSubscription? _timeRemainingSub;
  StreamSubscription? _pathSub;
  StreamSubscription? _isMovingSub;
  StreamSubscription? _itemPlacementsSub;
  StreamSubscription? _itemSwapInfoSub;
  StreamSubscription? _activePlayerSub;
  StreamSubscription? _toggleDoorSub;
  StreamSubscription? _isActionDoorToggledSub;
  StreamSubscription? _isCombatToggledSub;
  StreamSubscription? _doorsTargetSub;
  // COMBAT SUB
  StreamSubscription? _playerAroundTargetSub;
  StreamSubscription? _isInCombatSub;
  StreamSubscription? _combatUiEventsSub;

  Position? activePlayerPosition;
  Position? lastTappedTile;
  List<Player>? allPlayers;
  List<Player>? playerTargets;
  List<Position>? reachableTiles;
  List<Position>? doorsTarget;
  List<Position>? path;
  bool isActivePlayer = false;
  bool isMoving = false;
  // A update isActionSelected
  int? timeRemaining;
  List<dynamic>? itemPlacements;
  ItemSwapEvent? itemSwapEvent;
  Player? activePlayer;
  bool isActionDoorSelected = false;
  bool isActionAttackSelected = false;
  bool isInCombat = false;
  late final Map<String, GameObject> gameObjectByImage;

  // bool _combatModalAlreadyOpened = false;

  bool _combatDialogOpen = false;
  int _activeInfoDialogs = 0;

  late CombatService combatService;

  // Déplacer ces méthodes dans un service adaptée !

  bool isReachableTile(List<Position>? reachableTiles, int row, int col) {
    return widget.gameRoomService.isReachableTile(reachableTiles, row, col);
  }

  bool isDoorTargetTile(int row, int col) {
    if (doorsTarget == null) return false;
    return doorsTarget!.any((pos) => pos.x == row && pos.y == col);
  }

  bool isInPath(int row, int col) {
    if (path == null) return false;
    return path!.any((pos) => pos.x == row && pos.y == col);
  }

  bool isPlayerTarget(int row, int col) {
    if (playerTargets == null) return false;
    return playerTargets!.any(
      (player) => player.position.x == row && player.position.y == col,
    );
  }

  bool isTarget(int row, int col) {
    if (isActionDoorSelected) {
      return isDoorTargetTile(row, col);
    } else if (isActionAttackSelected) {
      return isPlayerTarget(row, col);
    } else {
      return false;
    }
  }

  GameObject getGameObjectFromImage(String path) => gameObjectByImage[path]!;

  GameObject? findDroppedItem(
    List<GameObject> oldInventory,
    List<GameObject> newInventory,
    GameObject foundItem,
  ) {
    final isFoundInNewInv = newInventory.any((item) => item.id == foundItem.id);

    if (!isFoundInNewInv) {
      return foundItem;
    }

    for (final oldItem in oldInventory) {
      final stillExists = newInventory.any((item) => item.id == oldItem.id);
      if (!stillExists) {
        return oldItem;
      }
    }

    return null;
  }

  void showTestSwapDialog(Player activePlayer, GameObject foundItem) async {
    if (activePlayer.inventory.length != 2) return;
    final inv0 = activePlayer.inventory[0]["image"] as String;
    final inv1 = activePlayer.inventory[1]["image"] as String;
    final oldInventory = activePlayer.inventory
        .map<GameObject>((item) => GameObject.fromJson(item))
        .toList();
    final listInventoryImages = await AppSwapItemDialog.show(
      context: context,
      bigItemImage: foundItem.image,
      inventoryImages: [inv0, inv1],
    );

    if (listInventoryImages == null) {
      return;
    }

    List<GameObject> newInventoryFromDialog = listInventoryImages
        .map((img) => getGameObjectFromImage(img))
        .toList();

    final droppedItem = findDroppedItem(
      oldInventory,
      newInventoryFromDialog,
      foundItem,
    );

    if (droppedItem == null) return;

    widget.gameRoomService.socket.emit("itemSwapped", {
      "inventoryToUndo": oldInventory.map((item) => item.toJson()).toList(),
      "newInventory": newInventoryFromDialog
          .map((item) => item.toJson())
          .toList(),
      "droppedItem": droppedItem.id,
    });
  }

  @override
  void initState() {
    super.initState();
    gameObjectByImage = {for (var g in gameItems) g.image: g};
    _bindToGameRoomService();
  }

  void _bindToGameRoomService() {
    _playerAroundTargetSub = widget.gameRoomService.playerAroundTargets$.listen(
      (playersAround) {
        if (mounted)
          setState(() {
            playerTargets = playersAround;
          });
      },
    );

    _doorsTargetSub = widget.gameRoomService.doorsTarget$.listen((targetDoors) {
      if (mounted)
        setState(() {
          doorsTarget = targetDoors;
        });
    });

    _isActionDoorToggledSub = widget.gameRoomService.isDoorToggled$.listen((
      isDoorToggled,
    ) {
      if (mounted) {
        setState(() {
          isActionDoorSelected = widget.gameRoomService.isDoorActionSelected();
          if (isActionDoorSelected) isActionAttackSelected = false;
        });
      }
    });

    _isCombatToggledSub = widget.gameRoomService.isActionAttackToggled$.listen((
      isAttackToggled,
    ) {
      if (mounted) {
        setState(() {
          isActionAttackSelected = widget.gameRoomService
              .isCombatActionSelected();
          if (isActionAttackSelected) isActionDoorSelected = false;
        });
      }
    });

    _isInCombatSub = widget.gameRoomService.isInCombat$.listen((isInBattle) {
      if (mounted) {
        if (isInBattle == true) {
          _showCombatModal();
        }

        setState(() => isInCombat = isInBattle);
      }
    });

    _isActivePlayerSub = widget.gameRoomService.isActivePlayer$.listen((
      isPlayerActive,
    ) {
      if (mounted)
        setState(() {
          isActivePlayer = isPlayerActive;
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

    _timeRemainingSub = widget.gameRoomService.timeBeforeTurn$.listen((
      timeBeforeTurn,
    ) {
      if (mounted)
        setState(() {
          timeRemaining = timeBeforeTurn;
        });
    });

    _isMovingSub = widget.gameRoomService.isMoving$.listen((isMovingValue) {
      if (mounted)
        setState(() {
          isMoving = isMovingValue;
        });
    });

    _pathSub = widget.gameRoomService.path$.listen((chosenPath) {
      if (mounted)
        setState(() {
          if (isActivePlayer) {
            path = chosenPath;
          }
        });
    });

    _reachableTilesSub = widget.gameRoomService.reachableTiles$.listen((
      tilesReachable,
    ) {
      if (mounted)
        setState(() {
          reachableTiles = tilesReachable;
        });
    });

    _itemPlacementsSub = widget.gameRoomService.itemsPlacement$.listen((
      itemPlacements,
    ) {
      if (mounted) {
        setState(() {
          widget.room?["gameMap"]["itemPlacement"] = itemPlacements;
        });
      }
    });

    _itemSwapInfoSub = widget.gameRoomService.itemSwapModal$.listen((
      itemSwapModal,
    ) {
      if (itemSwapModal != null) {
        itemSwapEvent = itemSwapModal;
        showTestSwapDialog(
          itemSwapEvent!.activePlayer,
          itemSwapEvent!.foundItem,
        );
      }
    });

    _toggleDoorSub = widget.gameRoomService.tilesGrid$.listen((tilesGrid) {
      if (mounted) {
        setState(() {
          widget.room?["gameMap"]["tiles"] = tilesGrid;
        });
      }
    });

    _listAllPlayersSub = widget.gameRoomService.listPlayers$.listen((
      listAllPlayers,
    ) {
      if (mounted)
        setState(() {
          allPlayers = listAllPlayers;
        });
    });
  }

  void _showCombatModal() {
    final combat = widget.gameRoomService.combatService;
    if (combat == null) return;

    if (_combatDialogOpen) return;
    _combatDialogOpen = true;

    _combatUiEventsSub?.cancel();
    _combatUiEventsSub = combat.uiEvents.listen((event) async {
      if (event.title != null) {
        _activeInfoDialogs++;
        widget.gameRoomService.setActiveInfoDialogs(_activeInfoDialogs);
        AppDialogs.showInfo(
          context: context,
          title: event.title!,
          message: event.message!,
          durationMs: event.durationMs,
          showOkButton: event.showOkButton,
        );
        Future.delayed(Duration(milliseconds: event.durationMs), () {
          _activeInfoDialogs--;
          widget.gameRoomService.setActiveInfoDialogs(_activeInfoDialogs);
        });
      }

      if (event.closeModal == true) {
        await Future.delayed(Duration(milliseconds: event.durationMs));
        if (mounted && Navigator.of(context, rootNavigator: true).canPop()) {
          Navigator.of(context, rootNavigator: true).pop();
        }
        _combatDialogOpen = false;
      }
    });

    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withOpacity(0.7),
      builder: (BuildContext context) {
        return Center(
          child: CombatModalWidget(
            onClose: () => Navigator.of(context, rootNavigator: true).pop(),
            onAttack: () => combat.triggerAttack(),
            onEvade: () => combat.triggerEvade(),
            combatService: combat,
          ),
        );
      },
    );
  }

  void sendNavigation() {
    if (this.isActivePlayer) {
      if (!this.isMoving) {
        this.isMoving = true;
        final movementPath = this.path;
        widget.gameRoomService.emitSendNavigation(movementPath);
        this.path = [];
      }
    }
  }

  bool handleTileClick(int row, int col, List<dynamic> tiles) {
    if (activePlayer == null) return false;
    if (!widget.gameRoomService.handleTileClick(
      Position(x: row, y: col),
      activePlayer!,
      tiles,
    )) {
      return true;
    } else {
      return false;
    }
  }

  @override
  void dispose() {
    _reachableTilesSub?.cancel();
    _listAllPlayersSub?.cancel();
    _isActivePlayerSub?.cancel();
    _isMovingSub?.cancel();
    _pathSub?.cancel();
    _timeRemainingSub?.cancel();
    _itemPlacementsSub?.cancel();
    _activePlayerSub?.cancel();
    _toggleDoorSub?.cancel();
    _isActionDoorToggledSub?.cancel();
    _doorsTargetSub?.cancel();
    _playerAroundTargetSub?.cancel();
    _isCombatToggledSub?.cancel();
    _itemSwapInfoSub?.cancel();
    _isInCombatSub?.cancel();
    _combatUiEventsSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.room == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final tiles = widget.room!["gameMap"]["tiles"] as List<dynamic>;
    final items = widget.room!["gameMap"]["itemPlacement"] as List<dynamic>;

    final String mapName = widget.room!["gameMap"]["name"] ?? "Unknown";
    final int rows = (widget.room!["gameMap"]["tiles"] as List).length;
    final int cols = (widget.room!["gameMap"]["tiles"][0] as List).length;
    final String mapSize = "${rows}x${cols}";

    final int playerCount =
        (allPlayers?.length) ?? (widget.room?["listPlayers"]?.length ?? 0);

    final bool dropIn = widget.room!["dropInEnabled"] == true;
    final bool quickElim = widget.room!["quickEliminationEnabled"] == true;

    if (tiles.isEmpty) {
      return const Center(child: Text("No tiles"));
    }

    if (items.isEmpty) {
      return const Center(child: Text("No items"));
    }

    final grid = tiles
        .map<List<int>>((row) => List<int>.from(row as List))
        .toList();

    final objects = items
        .map<List<int>>((row) => List<int>.from(row as List))
        .toList();

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            Text(
              mapSize,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontFamily: FontFamily.PAPYRUS,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              mapName,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontFamily: FontFamily.PAPYRUS,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              "$playerCount " + "GAME.PLAYERS".tr(),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontFamily: FontFamily.PAPYRUS,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (quickElim)
              Text(
                "GAME_CREATION.QUICK_ELIMINATION".tr(),
                style: TextStyle(
                  color: quickElim ? Colors.red : Colors.white,
                  fontSize: 16,
                  fontFamily: FontFamily.PAPYRUS,
                  fontWeight: FontWeight.bold,
                ),
              ),
            if (dropIn)
              Text(
                "DropIn/DropOut",
                style: TextStyle(
                  color: dropIn ? Colors.red : Colors.white,
                  fontSize: 16,
                  fontFamily: FontFamily.PAPYRUS,
                  fontWeight: FontWeight.bold,
                ),
              ),
          ],
        ),
        Flexible(
          flex: 8,
          child: Transform.translate(
            offset: Offset(0, -15),
            child: GridView.builder(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: grid[0].length,
              ),
              itemCount: grid.length * grid[0].length,
              itemBuilder: (context, index) {
                final row = index ~/ grid[0].length;
                final col = index % grid[0].length;
                final tileNumber = grid[row][col];
                final objectNumber = objects[row][col];
                final tileImage = gameTiles
                    .firstWhere((t) => t.id == tileNumber)
                    .image;
                final tappedTile = Position(x: row, y: col);

                String? objectImage;
                if (objectNumber != 0 &&
                    (objectNumber <= 8 || objectNumber == 21)) {
                  objectImage = gameItems
                      .firstWhere((i) => i.id == objectNumber)
                      .image;
                }
                final playersHere = (allPlayers ?? []).where((p) {
                  if (p.status == "disconnected") return false;
                  final pos = p.position;
                  return pos.x == row && pos.y == col;
                }).toList();

                return GestureDetector(
                  onTap: () {
                    final bool shouldContinue = handleTileClick(
                      row,
                      col,
                      tiles,
                    );
                    if (shouldContinue) return;
                    if (isReachableTile(reachableTiles, row, col) &&
                        timeRemaining == 0) {
                      if (lastTappedTile != null &&
                          lastTappedTile!.x == tappedTile.x &&
                          lastTappedTile!.y == tappedTile.y) {
                        sendNavigation();
                        lastTappedTile = null;
                      } else {
                        widget.gameRoomService.emitFindPath(row, col);
                        lastTappedTile = tappedTile;
                      }
                    } else {
                      setState(() {
                        path = null;
                        lastTappedTile = null;
                      });
                    }
                  },

                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Image.asset(
                        tileImage,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(Icons.block),
                      ),
                      if (isReachableTile(reachableTiles, row, col) &&
                          isActivePlayer &&
                          !(isActionDoorSelected || isActionAttackSelected) &&
                          timeRemaining == 0)
                        Positioned.fill(
                          child: Container(
                            color: Color.fromRGBO(88, 255, 166, 0.2),
                          ),
                        ),
                      if ((isActionDoorSelected || isActionAttackSelected) &&
                          isTarget(row, col) &&
                          isActivePlayer &&
                          timeRemaining == 0)
                        Positioned.fill(
                          child: Container(
                            color: Color.fromRGBO(88, 255, 166, 0.2),
                          ),
                        ),

                      if (objectImage != null)
                        ClipOval(
                          child: Image.asset(
                            objectImage,
                            fit: BoxFit.contain,
                            width: 50,
                            height: 50,
                          ),
                        ),
                      for (var player in playersHere)
                        ClipOval(
                          child: Image.asset(
                            player.avatar["src"],
                            fit: BoxFit.contain,
                            width: 50,
                            height: 50,
                          ),
                        ),
                      if (isInPath(row, col) &&
                          isActivePlayer &&
                          timeRemaining == 0)
                        Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.grey[800],
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
