import 'dart:async';

import 'package:client_leger/interfaces/attributes.dart';
import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/interfaces/position.dart';
import 'package:client_leger/services/game/game-room-service.dart';
import 'package:client_leger/utils/constants/item-info/item-info.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class PlayerInfoInventory extends StatefulWidget {
  const PlayerInfoInventory({
    super.key,
    required this.gameRoomService,
    this.room,
  });
  final GameRoomService gameRoomService;
  final Map<String, dynamic>? room;

  @override
  State<PlayerInfoInventory> createState() => _PlayerInfoInventoryState();
}

class _PlayerInfoInventoryState extends State<PlayerInfoInventory> {
  StreamSubscription? _listAllPlayersSub;
  StreamSubscription? _activePlayerSub;
  List<Player>? listAllPlayersStatic;
  List<Player>? listAllPlayersDynamic;
  Player? localPlayer;
  int? movementPoints;
  int? currentHealth;
  int? maxHealth;
  // double? healthPercentage;

  void _bindToGameRoomService() {
    _listAllPlayersSub = widget.gameRoomService.listPlayers$.listen((
      allPlayers,
    ) {
      if (!mounted) return;

      setState(() {
        listAllPlayersDynamic = allPlayers;
        localPlayer = getLocalPlayer(allPlayers);
        movementPoints = localPlayer?.attributes.movementPointsLeft;
        maxHealth = localPlayer?.attributes.totalHp;
      });
    });

    _activePlayerSub = widget.gameRoomService.activePlayer$.listen((
      activePlayer,
    ) {
      if (mounted) {
        setState(() {
          if (localPlayer?.name == activePlayer.name) {
            localPlayer?.attributes = activePlayer.attributes;
            localPlayer?.inventory = activePlayer.inventory;
            localPlayer?.attributes.currentHp = activePlayer.attributes.totalHp;
          }
        });
      }
    });
  }

  @override
  void initState() {
    super.initState();
    if (widget.room != null) {
      listAllPlayersStatic = (widget.room!["listPlayers"] as List)
          .map((p) => Player.fromJson(Map<String, dynamic>.from(p)))
          .toList();
      localPlayer = getLocalPlayer(listAllPlayersStatic);
      movementPoints = localPlayer?.attributes.speed;
    }
    maxHealth =
        localPlayer?.attributes.totalHp ??
        listAllPlayersStatic
            ?.firstWhere((p) => p.id == localPlayer?.id)
            .attributes
            .totalHp ??
        0;
    _bindToGameRoomService();
  }

  @override
  void dispose() {
    _listAllPlayersSub?.cancel();
    _activePlayerSub?.cancel();
    super.dispose();
  }

  Player? getLocalPlayer(List<Player>? typeAllPlayers) {
    if (widget.room == null) return null;
    String? socketId = widget.gameRoomService.socket.id;
    if (socketId == null || typeAllPlayers == null) return null;

    return typeAllPlayers.firstWhere(
      (player) => player.id == socketId,
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
  }

  bool isD4Attack(Player? localPlayer) {
    return localPlayer?.attributes.atkDiceMax == 4;
  }

  bool isD4Defense(Player? localPlayer) {
    return localPlayer?.attributes.defDiceMax == 4;
  }

  @override
  Widget build(BuildContext context) {
    final palette = ThemeConfig.palette.value;
    double healthPercentage = 1;
    int actionPoints = (localPlayer?.attributes.actionPoints ?? 0).clamp(
      0,
      999,
    );
    final bool isEliminated = localPlayer?.status == 'disconnected';

    return Container(
      margin: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            localPlayer!.name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontFamily: 'Papyrus',
              fontWeight: FontWeight.bold,
            ),
          ),
          Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white, width: 2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: ColorFiltered(
                    colorFilter: isEliminated
                        ? const ColorFilter.matrix([
                            0.2126,
                            0.7152,
                            0.0722,
                            0,
                            0,
                            0.2126,
                            0.7152,
                            0.0722,
                            0,
                            0,
                            0.2126,
                            0.7152,
                            0.0722,
                            0,
                            0,
                            0,
                            0,
                            0,
                            1,
                            0,
                          ])
                        : const ColorFilter.matrix([
                            1,
                            0,
                            0,
                            0,
                            0,
                            0,
                            1,
                            0,
                            0,
                            0,
                            0,
                            0,
                            1,
                            0,
                            0,
                            0,
                            0,
                            0,
                            1,
                            0,
                          ]),
                    child: Image.asset(
                      localPlayer!.avatar["src"],
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      width: double.infinity,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 150,
                            height: 20,
                            child: Stack(
                              children: [
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade300,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 1,
                                    ),
                                  ),
                                ),

                                Container(
                                  width:
                                      150 * (healthPercentage.clamp(0.0, 1.0)),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      begin: Alignment.centerLeft,
                                      end: Alignment.centerRight,
                                      stops: [0.0, 0.33, 0.67, 1.0],
                                      colors: [
                                        Color.fromRGBO(51, 16, 16, 1),
                                        Color.fromRGBO(93, 20, 20, 1),
                                        Color.fromRGBO(142, 24, 24, 1),
                                        Color.fromRGBO(175, 16, 16, 1),
                                      ],
                                    ),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 1,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(width: 8),

                          Text(
                            "${(maxHealth ?? 0).clamp(0, 999)}/${(maxHealth ?? 0).clamp(0, 999)}",
                            style: TextStyle(
                              color: palette.primaryLight,
                              fontSize: 16,
                              fontFamily: 'Papyrus',
                              fontWeight: FontWeight.bold,
                              shadows: const [
                                Shadow(
                                  blurRadius: 2.0,
                                  color: Colors.black,
                                  offset: Offset(1.0, 1.0),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.only(left: 16),
                      child: Text(
                        "GAME.SPD".tr() + ": ${localPlayer?.attributes.speed}",
                        style: TextStyle(
                          color: palette.primaryLight,
                          fontSize: 16,
                          fontFamily: 'Papyrus',
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          margin: const EdgeInsets.only(left: 16),
                          child: Text(
                            "GAME.ATK".tr() +
                                ": ${localPlayer?.attributes.attack}",
                            style: TextStyle(
                              color: palette.primaryLight,
                              fontSize: 16,
                              fontFamily: 'Papyrus',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Image.asset(
                          isD4Attack(localPlayer)
                              ? 'assets/images/icones/D4.png'
                              : 'assets/images/icones/D6.png',
                          width: 20,
                          height: 20,
                          fit: BoxFit.cover,
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          margin: const EdgeInsets.only(left: 16),
                          child: Text(
                            "GAME.DEF".tr() +
                                ": ${localPlayer?.attributes.defense}",
                            style: TextStyle(
                              color: palette.primaryLight,
                              fontSize: 16,
                              fontFamily: 'Papyrus',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Image.asset(
                          isD4Defense(localPlayer)
                              ? 'assets/images/icones/D4.png'
                              : 'assets/images/icones/D6.png',
                          width: 20,
                          height: 20,
                          fit: BoxFit.cover,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                "GAME.MOVEMENTS".tr() + ":",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontFamily: 'Papyrus',
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(width: 16),
              ...List.generate((movementPoints ?? 0).clamp(0, 999), (index) {
                final bool shrink = (movementPoints ?? 0) > 8;

                return Container(
                  margin: EdgeInsets.only(right: shrink ? 4 : 7),
                  child: CircleAvatar(
                    radius: shrink ? 5 : 8,
                    backgroundColor: palette.primary,
                  ),
                );
              }),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                "GAME.ACTION_POINTS".tr() + ":",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontFamily: 'Papyrus',
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(width: 16),
              ...List.generate(
                actionPoints,
                (index) => Container(
                  margin: EdgeInsets.only(right: 8),
                  child: CircleAvatar(
                    radius: 8,
                    backgroundColor: palette.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(3),
            height: 120,
            width: 300,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                stops: [0.0, 0.3, 0.7, 1.0],
                colors: [
                  Color.fromRGBO(0, 0, 0, 0),
                  Color.fromRGBO(217, 217, 217, 0.2),
                  Color.fromRGBO(161, 161, 161, 0.2),
                  Color.fromRGBO(0, 0, 0, 0),
                ],
              ),
            ),
            child: Column(
              children: [
                Text(
                  "GAME.INVENTORY".tr(),
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontFamily: 'Papyrus',
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (localPlayer?.inventory != null)
                      ...List.generate(2, (index) {
                        if (index < localPlayer!.inventory.length) {
                          final item = localPlayer!.inventory[index];
                          final imagePath = item["image"] ?? "";
                          return GestureDetector(
                            onTap: () => _showItemPopup(context, item),
                            child: Container(
                              margin: const EdgeInsets.symmetric(
                                horizontal: 10,
                              ),
                              width: 75,
                              height: 75,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                image: DecorationImage(
                                  image: AssetImage(imagePath),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          );
                        } else {
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 10),
                            width: 75,
                            height: 75,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              color: const Color.fromRGBO(30, 30, 30, 1),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.2),
                                width: 1,
                              ),
                            ),
                          );
                        }
                      }),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

void _showItemPopup(BuildContext context, Map<String, dynamic> item) {
  final itemId = item["id"];
  final gameItem = gameItems.firstWhere((g) => g.id == itemId);

  AppDialogs.showInfo(
    context: context,
    title: gameItem.name,
    message: gameItem.description,
    showOkButton: true,
    okLabel: "DIALOG.CLOSE",
  );
}