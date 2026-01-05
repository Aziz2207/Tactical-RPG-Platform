import 'package:client_leger/services/challenge/challenge_service.dart';
import 'package:client_leger/utils/constants/challenges/challenges-list.dart';
import 'package:client_leger/widgets/forms/character-forms.dart';
import 'package:client_leger/screens/waiting/waiting.dart';
import 'package:client_leger/services/create_game/create_game_service.dart';
import 'package:client_leger/services/join_game/join_game_service.dart'
    show Player, JoinGameService;
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:client_leger/models/lobby_player.dart';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'dart:convert';
import 'game_item.dart';
import 'package:easy_localization/easy_localization.dart';

class GameCard extends StatelessWidget {
  static const double cardSize = 250;
  final GameItem game;
  final String fontFamily;

  String get gameState => game.state == "GAME.STATE.SHARED"
      ? 'GAME.STATE.SHARED'.tr()
      : 'GAME.STATE.PUBLIC'.tr();

  String get gameMode => game.mode == "GAME.MODE.CLASSIC"
      ? 'GAME.MODE.CLASSIC'.tr()
      : 'GAME.MODE.CTF'.tr();

  const GameCard({required this.game, required this.fontFamily, super.key});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        final service = CreateGameService();
        try {
          await service.connect();

          String? selectedAvatar;
          Map<String, int> playerStats = {
            'speed': 4,
            'life': 4,
            'attack': 4,
            'defense': 4,
          };
          String availability = 'public'; // 'public' | 'friends'

          final confirmed = await showDialog<Map<String, dynamic>>(
            context: context,
            barrierDismissible: false,
            builder: (_) => CharacterForms(
              showAvailability: true,
              initialAvailability: 'public',
              disabledAvatarNames: const {},
              onSelectAvatar: (avatarPath) {
                selectedAvatar = avatarPath;
              },
              onConfirm:
                  ({
                    required String name,
                    required String avatarPath,
                    required Map<String, int> stats,
                  }) {
                    selectedAvatar = avatarPath;
                    playerStats = stats;
                  },
            ),
          );

          if (confirmed == null) return;
          availability = (confirmed['availability'] as String?) ?? 'public';
          final entryFee = (confirmed['entryFee'] as int?) ?? 0;
          final serverAvailability = availability == 'friends'
              ? 'friends-only'
              : 'public';

          final result = await service.createRoom(
            game.raw,
            gameAvailability: serverAvailability,
            entryFee: entryFee,
            quickEliminationEnabled: confirmed['quickElimination'] ?? false,
          );
          final joinService = JoinGameService();
          joinService.connect();

          final profile = await AuthService().getCurrentUserProfile();
          final firebaseUser = FirebaseAuth.instance.currentUser;
          final username = profile?.username ?? firebaseUser?.email ?? 'Player';

          final player = Player(
            name: username,
            avatar: selectedAvatar ?? '',
            stats: playerStats,
          );

          joinService.handleJoinGame(context, result.roomId, (room, message) {
            if (room == null) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      message.isNotEmpty
                          ? message
                          : 'ERROR.JOIN_GAME_FAILED'.tr(),
                    ),
                  ),
                );
              }
              return;
            }

            if (selectedAvatar != null && selectedAvatar!.isNotEmpty) {
              joinService.selectCharacter(selectedAvatar!);
            }

            joinService.joinLobby(
              context,
              roomId: result.roomId,
              player: player,
              onNavigateToLobby: () {
                if (!context.mounted) return;
                final selfId = SocketService.I.id ?? '';
                final initialSelf = LobbyPlayer(
                  id: selfId,
                  name: username,
                  avatarPath: selectedAvatar ?? '',
                  isBot: false,
                  status: 'admin',
                  behavior: 'sentient',
                  assignedChallenge: ChallengesConstants().fakeChallenge,
                );
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => WaitingPage(
                      roomCode: result.roomId,
                      initialIsAdmin: true,
                      initialSelf: initialSelf,
                      initialMapName: game.name,
                      initialMode: game.mode,
                      initialAvailability: serverAvailability,
                      initialEntryFee: entryFee,
                      initialQuickElimination:
                          confirmed['quickElimination'] ?? false,
                    ),
                  ),
                );
              },
            );
          });
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('${'ERROR.CREATE_GAME_FAILED'.tr()}: $e')),
            );
          }
        }
      },
      child: Container(
        height: cardSize,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.9),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            Container(
              width: cardSize,
              height: cardSize,
              color: Colors.black12,
              child: game.image.isNotEmpty
                  ? (game.image.startsWith('data:image')
                        ? Image.memory(
                            base64Decode(game.image.split(',').last),
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(Icons.broken_image, size: 40),
                          )
                        : Image.network(
                            game.image,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(Icons.broken_image, size: 40),
                          ))
                  : const Icon(Icons.image, size: 40),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    game.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: fontFamily,
                      fontWeight: FontWeight.bold,
                      fontSize: 24,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${game.dimension} x ${game.dimension} • ${this.gameMode} • ${this.gameState}',
                    style: TextStyle(
                      fontFamily: fontFamily,
                      fontSize: 24,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDate(game.lastModification),
                    style: TextStyle(
                      fontFamily: fontFamily,
                      color: Colors.black54,
                      fontSize: 24,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
          ],
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.tryParse(iso);
      if (d == null) return '';
      String two(int n) => n.toString().padLeft(2, '0');
      return '${d.year}-${two(d.month)}-${two(d.day)} ${two(d.hour)}:${two(d.minute)}';
    } catch (_) {
      return '';
    }
  }
}
