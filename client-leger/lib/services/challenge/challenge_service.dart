import 'package:client_leger/interfaces/player.dart';

class ChallengeService {
  static int getChallengeValue(Player? player) {
    final challenge = player?.assignedChallenge;
    final challengeId = challenge?.id;

    switch (challengeId) {
      case 0:
        final uniquePositions = player?.positionHistory.toSet().length ?? 0;
        final goal = challenge?.goal ?? 0;
        return uniquePositions > goal ? goal : uniquePositions;

      case 1:
        final evasions = player?.postGameStats?["evasions"] ?? 0;
        final goal = challenge?.goal ?? 0;
        return evasions > goal ? goal : evasions;

      case 2:
        final itemsCount = player?.collectedItems.length ?? 0;
        final goal = challenge?.goal ?? 0;
        return itemsCount > goal ? goal : itemsCount;

      case 3:
        final victories = player?.postGameStats?["victories"] ?? 0;
        final goal = challenge?.goal ?? 0;
        return victories > goal ? goal : victories;

      case 4:
        final doorsInteracted = player?.postGameStats?["doorsInteracted"] ?? 0;
        final goal = challenge?.goal ?? 0;
        return doorsInteracted > goal ? goal : doorsInteracted;

      default:
        return 0;
    }
  }

  static bool isChallengeSuccess(Player? player) {
    if (player?.assignedChallenge == null) return false;
    return getChallengeValue(player) >= (player?.assignedChallenge?.goal ?? 1);
  }
}
