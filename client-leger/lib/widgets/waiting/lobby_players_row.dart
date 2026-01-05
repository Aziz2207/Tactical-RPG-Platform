import 'package:flutter/material.dart';
import 'package:client_leger/models/lobby_player.dart';
import 'package:client_leger/widgets/waiting/lobby_player_card.dart';

class LobbyPlayersRow extends StatelessWidget {
  final List<LobbyPlayer> players;
  final bool isAdmin;
  final String? currentPlayerId;
  final void Function(LobbyPlayer player)? onKick;
  final double minCardWidth;
  final double maxCardWidth;
  const LobbyPlayersRow({
    super.key,
    required this.players,
    required this.isAdmin,
    this.currentPlayerId,
    this.onKick,
    this.minCardWidth = 220,
    this.maxCardWidth = 220,
  });

  @override
  Widget build(BuildContext context) {
    if (players.isEmpty) {
      return const Center(
        child: Text(
          'Aucun joueur pour le moment...',
          style: TextStyle(color: Colors.white70, fontSize: 18),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final double itemMaxWidth = maxCardWidth;
        final double itemMinWidth = minCardWidth;
        double itemWidth = itemMaxWidth;
        if (constraints.maxWidth < itemMaxWidth * 1.1) {
          itemWidth = constraints.maxWidth.clamp(itemMinWidth, itemMaxWidth);
        }

        final double availableHeight = constraints.hasBoundedHeight
            ? constraints.maxHeight
            : 280.0;

        return SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: availableHeight),
            child: Align(
              alignment: Alignment.topCenter,
              child: Wrap(
                alignment: WrapAlignment.center,
                spacing: 10,
                runSpacing: 16,
                children: [
                  for (int i = 0; i < players.length; i++)
                    SizedBox(
                      width: itemWidth,
                      height: availableHeight,
                      child: LobbyPlayerCard(
                        name: players[i].name.isEmpty
                            ? (players[i].isBot ? 'Bot' : 'Joueur')
                            : players[i].name,
                        status: players[i].status,
                        behavior: players[i].behavior,
                        avatarPath: players[i].avatarPath,
                        isKickVisible:
                            isAdmin &&
                            players[i].status != 'admin' &&
                            (currentPlayerId == null ||
                                players[i].id != currentPlayerId),
                        onKick: onKick == null
                            ? null
                            : () => onKick!(players[i]),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
