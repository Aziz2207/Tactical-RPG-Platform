import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/models/post_game_attribute.dart';

bool _isPlayerDisconnected(Player player) {
  return player.status != null && (player.status == 'disconnected');
}

String _getAvatarSrc(Player player) {
  if (player.avatar != null && player.avatar is Map) {
    return player.avatar['src'] ?? 'assets/images/characters/default.webp';
  }
  return 'assets/images/characters/default.webp';
}

class PlayerStatistics extends StatelessWidget {
  final Player player;
  final String selectedAttribute;
  final bool isCurrentPlayer;
  final bool isWinner;
  final List<PostGameAttribute> postGameAttributes;
  final List<Player> allPlayers; // Add this to calculate max values

  const PlayerStatistics({
    Key? key,
    required this.player,
    required this.selectedAttribute,
    required this.isCurrentPlayer,
    required this.isWinner,
    required this.postGameAttributes,
    required this.allPlayers,
  }) : super(key: key);

  double _getMaxStatValue(String key) {
    double maxValue = 0;
    for (var p in allPlayers) {
      if (p.postGameStats != null && p.postGameStats is Map) {
        final value = p.postGameStats[key];
        if (value != null && value is num) {
          maxValue = maxValue > value.toDouble() ? maxValue : value.toDouble();
        }
      }
    }
    return maxValue > 0 ? maxValue : 1; // Avoid division by zero
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        final screenWidth = MediaQuery.of(context).size.width * 0.75;
        final decorationBarWidth = 4.8;
        final avatarWidth = 81.6;
        final avatarMargin = 20.0;
        final nameWidth = screenWidth * 0.25;
        final totalStatWidth =
            screenWidth -
            decorationBarWidth -
            avatarWidth -
            avatarMargin -
            nameWidth;
        final statWidth = totalStatWidth / postGameAttributes.length;
        final isDisconnected = _isPlayerDisconnected(player);

        return Container(
          width: screenWidth,
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: palette.mainTextColor.withOpacity(0.08),
                width: 0.8,
              ),
            ),
            gradient: LinearGradient(
              begin: Alignment.centerRight,
              end: Alignment.centerLeft,
              colors: isCurrentPlayer
                  ? [Colors.transparent, Color(0x26FFF098), Color(0x40FFF098)]
                  : isDisconnected
                      ? [
                          Colors.transparent,
                          Color(0x33B50505),
                          Color(0x40B50505),
                        ]
                      : [
                          Colors.transparent,
                          palette.secondaryLight.withOpacity(0.2),
                          palette.secondaryLight.withOpacity(0.25),
                        ],
            ),
          ),
          child: Row(
            children: [
              Container(
                width: decorationBarWidth,
                height: 80,
                decoration: BoxDecoration(
                  color: isDisconnected
                      ? Color(0xFFC82020)
                      : isCurrentPlayer
                          ? palette.primary
                          : palette.secondaryVeryLight,
                  border: Border.all(
                    color: palette.mainTextColor.withOpacity(0.05),
                    width: 0.5,
                  ),
                ),
              ),
              Container(
                width: avatarWidth,
                height: 81.6,
                margin: EdgeInsets.only(right: avatarMargin),
                child: ClipRRect(
                  child: ColorFiltered(
                    colorFilter: isDisconnected
                        ? ColorFilter.mode(Colors.grey, BlendMode.saturation)
                        : ColorFilter.mode(
                            Colors.transparent,
                            BlendMode.multiply,
                          ),
                    child: Image.asset(
                      _getAvatarSrc(player),
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: palette.secondaryDark,
                          child: Icon(
                            Icons.person,
                            size: 40,
                            color: palette.mainTextColor.withOpacity(0.54),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
              SizedBox(
                width: nameWidth,
                child: Row(
                  children: [
                    if (isWinner) ...[
                      Image.asset(
                        'assets/images/leaves/leafL_light.webp',
                        width: 40,
                        height: 60,
                        errorBuilder: (context, error, stackTrace) =>
                            SizedBox(width: 40, height: 60),
                      ),
                      SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Text(
                        player.name,
                        style: TextStyle(
                          color: isDisconnected
                              ? palette.secondaryLight
                              : palette.mainTextColor,
                          fontSize: 16,
                          fontFamily: 'Papyrus',
                          fontWeight: FontWeight.bold,
                          decoration: isDisconnected
                              ? TextDecoration.lineThrough
                              : TextDecoration.none,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isWinner) ...[
                      SizedBox(width: 8),
                      Image.asset(
                        'assets/images/leaves/leafR_light.webp',
                        width: 40,
                        height: 60,
                        errorBuilder: (context, error, stackTrace) =>
                            SizedBox(width: 40, height: 60),
                      ),
                    ],
                  ],
                ),
              ),
              ...postGameAttributes.map((attr) {
                if (attr.isGrouped && attr.groupKeys != null) {
                  final values = attr.groupKeys!
                      .map((key) {
                        if (player.postGameStats != null &&
                            player.postGameStats is Map) {
                          return '${player.postGameStats[key] ?? 0}';
                        }
                        return '0';
                      })
                      .join('/');

                  return SizedBox(
                    width: statWidth,
                    child: Center(
                      child: Text(
                        values,
                        style: TextStyle(
                          color: selectedAttribute == attr.key
                              ? palette.primary
                              : palette.mainTextColor,
                          fontSize: 18,
                          fontFamily: 'Papyrus',
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  );
                } else {
                  final statValue = (player.postGameStats != null &&
                          player.postGameStats is Map)
                      ? player.postGameStats[attr.key] ?? 0
                      : 0;

                  final displayValue = attr.key == 'tilesVisited'
                      ? '$statValue%'
                      : '$statValue';

                  // Determine if we need a progress bar
                  final showProgressBar = attr.key == 'damageDealt' ||
                      attr.key == 'damageTaken' ||
                      attr.key == 'tilesVisited';

                  double progressValue = 0;
                  if (showProgressBar) {
                    if (attr.key == 'tilesVisited') {
                      progressValue = (statValue is num ? statValue.toDouble() : 0) / 100;
                    } else {
                      final maxValue = _getMaxStatValue(attr.key);
                      progressValue = (statValue is num ? statValue.toDouble() : 0) / maxValue;
                    }
                    progressValue = progressValue.clamp(0.0, 1.0);
                  }

                  return SizedBox(
                    width: statWidth,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            displayValue,
                            style: TextStyle(
                              color: selectedAttribute == attr.key
                                  ? palette.primary
                                  : palette.mainTextColor,
                              fontSize: 18,
                              fontFamily: 'Papyrus',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (showProgressBar) ...[
                            SizedBox(height: 4),
                            Container(
                              width: statWidth * 0.8,
                              height: 6,
                              decoration: BoxDecoration(
                                color: palette.mainTextColor.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: FractionallySizedBox(
                                alignment: Alignment.centerLeft,
                                widthFactor: progressValue,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: selectedAttribute == attr.key
                                        ? palette.primary
                                        : palette.mainTextColor.withOpacity(0.7),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }
              }),
            ],
          ),
        );
      },
    );
  }
}