import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';

class CircularTimerTurnCombat extends StatelessWidget {
  final int timeRemaining;
  final bool isCurrentPlayer;
  final String activePlayerName;
  final ThemePalette palette;

  const CircularTimerTurnCombat({
    Key? key,
    required this.timeRemaining,
    required this.isCurrentPlayer,
    required this.activePlayerName,
    required this.palette,
  }) : super(key: key);

  Color _getBorderColor() {
    if (timeRemaining <= 2) {
      return const Color(0xFFF95E4D);
    } else {
      return palette.primary;
    }
  }

  Color _getTextColor() {
    return timeRemaining <= 2 ? const Color(0xFFF95E4D) : Colors.white;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 15.0),
      child: Center(
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: _getBorderColor(), width: 6),
          ),
          child: Center(
            child: Text(
              '$timeRemaining',
              style: TextStyle(
                fontFamily: 'Verdana',
                fontSize: 38,
                fontWeight: FontWeight.bold,
                color: _getTextColor(),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
