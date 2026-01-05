import 'dart:async';

import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/services/game/game-room-service.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class IngamePlayerSidebar extends StatefulWidget {
  final GameRoomService gameRoomService;
  final Map<String, dynamic>? room;

  const IngamePlayerSidebar({
    super.key,
    required this.gameRoomService,
    this.room,
  });

  @override
  State<IngamePlayerSidebar> createState() => _IngamePlayerSidebarState();
}

class TempPlayer {
  String id;
  String name;
  String photo;
  int victories;
  String role;
  bool isActive;

  TempPlayer({
    required this.id,
    required this.name,
    required this.photo,
    required this.victories,
    this.role = 'player',
    this.isActive = false,
  });
}

class _IngamePlayerSidebarState extends State<IngamePlayerSidebar> {
  StreamSubscription? _allPlayersSub;
  List<Player>? listAllPlayers;

  void _bindToGameRoomService() {
    _allPlayersSub = widget.gameRoomService.listPlayers$.listen((allPlayers) {
      if (mounted)
        setState(() {
          listAllPlayers = allPlayers;
        });
    });
  }

  @override
  void initState() {
    super.initState();
    if (listAllPlayers == null) {
      final raw = widget.room?["listPlayers"];
      if (raw is List) {
        listAllPlayers = raw
            .map((p) => Player.fromJson(Map<String, dynamic>.from(p)))
            .toList();
      }
    }
    _bindToGameRoomService();
  }

  @override
  void dispose() {
    _allPlayersSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      child: SizedBox(
        height: 260,
        child: SingleChildScrollView(
          child: Column(
            children: (listAllPlayers ?? []).map((player) {
              final bool isAdmin = player.status == 'admin';
              final bool isBot = player.status == 'bot';
              final bool isEliminated = player.status == 'disconnected';
              final displayName = player.name.length > 12
                  ? player.name.substring(0, 12) + "…"
                  : player.name;
              final bool hasFlag = player.inventory.any(
                (item) => item["id"] == 21,
              );
              final TextStyle eliminatedNameStyle = TextStyle(
                fontSize: 16,
                fontFamily: 'Papyrus',
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade500,
                decoration: TextDecoration.lineThrough,
                decorationThickness: 2,
              );

              return Container(
                margin: const EdgeInsets.symmetric(vertical: 2),
                padding: const EdgeInsets.all(2),
                decoration: player.isActive
                    ? BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [
                            Color.fromRGBO(0, 0, 0, 0),
                            Color.fromRGBO(222, 207, 129, 0.3),
                            Color.fromRGBO(163, 147, 71, 0.3),
                            Color.fromRGBO(0, 0, 0, 0),
                          ],
                          stops: [0.0, 0.3, 0.7, 1.0],
                        ),
                        borderRadius: BorderRadius.circular(8),
                      )
                    : null,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    player.isActive
                        ? Image.asset(
                            'assets/images/icones/golden-arrow.png',
                            width: 40,
                            height: 40,
                            fit: BoxFit.cover,
                          )
                        : const SizedBox(width: 40, height: 40),
                    const SizedBox(width: 10),
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isAdmin ? Colors.red : Colors.white,
                          width: 3,
                        ),
                      ),
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

                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(100),
                          child: Image.asset(
                            player.avatar["src"],
                            width: 50,
                            height: 50,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),

                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: isEliminated
                              ? eliminatedNameStyle
                              : TextStyle(
                                  fontSize: 16,
                                  fontFamily: 'Papyrus',
                                  fontWeight: FontWeight.bold,
                                  color: isAdmin ? Colors.red : Colors.white,
                                ),
                        ),
                        const SizedBox(height: 6),
                        if (isEliminated)
                          Text(
                            'GAME.DISCONNECTED'.tr(),
                            style: TextStyle(
                              fontFamily: FontFamily.PAPYRUS,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey.shade400,
                            ),
                          )
                        else
                          Text(
                            '${player.postGameStats["victories"]} ' +
                                'GAME.VICTORIES'.tr(),
                            style: const TextStyle(
                              fontSize: 16,
                              color: Color.fromRGBO(255, 217, 25, 1),
                              fontFamily: 'Papyrus',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                      ],
                    ),
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (hasFlag)
                              Image.asset(
                                './assets/images/icones/flag.png',
                                height: 48,
                                fit: BoxFit.cover,
                              ),
                            if (isAdmin && !hasFlag)
                              Padding(
                                padding: const EdgeInsets.only(left: 6),
                                child: Icon(
                                  Icons.person,
                                  color: Colors.red,
                                  size: 48,
                                ),
                              ),
                            if (isBot && !hasFlag)
                              const Padding(
                                padding: EdgeInsets.only(left: 6),
                                child: Text(
                                  '🤖',
                                  style: TextStyle(fontSize: 33),
                                ),
                              ),

                            if (isEliminated)
                              Padding(
                                padding: EdgeInsets.only(left: 6),
                                child: Icon(
                                  LucideIcons.skull,
                                  color: Colors.white,
                                  size: 40,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

// <div class="player" [ngClass]="{ active: sidebarPlayer.isActive }">
//     <div class="active-slot">
//         @if (sidebarPlayer.isActive){
//         <img class="active-arrow-img" src="./assets/images/icones/golden-arrow.png" alt="Active Slot Icon" />
//         }
//     </div>
//     <div class="avatar-img" [ngClass]="sidebarPlayer.status">
//         <img src="{{ sidebarPlayer.avatar?.src }}" alt="avatar-img" />
//     </div>
//     <div class="player-info">
//         <p class="player-name" [ngClass]="sidebarPlayer.status">{{ sidebarPlayer.name }}</p>
//         @if(sidebarPlayer.status === "disconnected"){
//         <p class="gray">{{ 'GAME.DISCONNECTED' | translate }}</p>
//         } @else {
//         <p class="status">{{ sidebarPlayer.postGameStats.victories }} {{ 'GAME.VICTORIES' | translate }}</p>
//         }
//     </div>
//     <div class="icon"  [ngClass]="sidebarPlayer.status">
//         @if(isFlagInInventory()){
//             <img src="./assets/images/icones/flag.png" alt="admin-img" />
//         } @else if(sidebarPlayer.status === "admin"){
//             <img src="./assets/images/icones/admin.png" alt="admin-img" />
//         } @else if(sidebarPlayer.status === "bot"){
//             <img src="./assets/images/icones/bot.png" alt="admin-img" />
//         } @else if(sidebarPlayer.status === "disconnected"){
//             <lucide-icon [img]="Skull"></lucide-icon>
//         }
//     </div>
// </div>
