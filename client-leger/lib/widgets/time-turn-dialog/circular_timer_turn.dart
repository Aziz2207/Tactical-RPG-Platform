import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class CircularTimerTurn extends StatelessWidget {
  final int timeRemaining;
  final String? activePlayerName;
  final bool isCurrentPlayer;
  final bool isDropIn;
  final int dropInModalCount;
  final VoidCallback onDropInModalShown;

  const CircularTimerTurn({
    super.key,
    required this.timeRemaining,
    this.activePlayerName,
    required this.isCurrentPlayer,
    required this.isDropIn,
    required this.dropInModalCount,
    required this.onDropInModalShown,
  });

  @override
  Widget build(BuildContext context) {
    if (timeRemaining <= 0) {
      return const SizedBox.shrink();
    }

    if (isDropIn && dropInModalCount < 1) {
      onDropInModalShown();
      return const SizedBox.shrink();
    }

    return _buildRegularTimer();
  }

  Widget _buildRegularTimer() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          colors: [Color(0xFF3A3733), Color(0xFF171414)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isCurrentPlayer) ...[
            Text(
              "GAME.TURN_START_WARNING".tr(),
              style: TextStyle(
                fontSize: 22,
                color: Colors.white,
                fontFamily: 'Papyrus',
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: timeRemaining == 3 ? Colors.yellow : Colors.red,
                  width: 6,
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                "$timeRemaining",
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  color: timeRemaining == 3 ? Colors.white : Colors.red,
                ),
              ),
            ),
          ] else ...[
            Text(
              "GAME.TURN_OF".tr(),
              style: TextStyle(
                fontSize: 22,
                color: Colors.white,
                fontFamily: 'Papyrus',
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              activePlayerName ?? "???",
              style: const TextStyle(
                fontSize: 26,
                color: Colors.yellow,
                fontFamily: 'Papyrus',
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              "GAME.TURN_WILL_START".tr(),
              style: TextStyle(
                fontSize: 22,
                color: Colors.white,
                fontFamily: 'Papyrus',
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}
