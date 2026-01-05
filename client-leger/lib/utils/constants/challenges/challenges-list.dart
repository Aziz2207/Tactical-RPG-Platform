import 'package:client_leger/models/challenge.dart';

class ChallengesConstants {
  static List<Challenge> challenges = [
    Challenge(
      id: 0,
      key: ChallengeKey.visitedTiles,
      title: "CHALLENGES.EXPLORER.TITLE",
      description: "CHALLENGES.EXPLORER.DESCRIPTION",
      goal: 5,
      reward: 50,
    ),
    Challenge(
      id: 1,
      key: ChallengeKey.evasions,
      title: "CHALLENGES.STRATEGIC_RETREAT.TITLE",
      description: "CHALLENGES.STRATEGIC_RETREAT.DESCRIPTION",
      goal: 1,
      reward: 50,
    ),
    Challenge(
      id: 2,
      key: ChallengeKey.items,
      title: "CHALLENGES.RELIC_HUNTER.TITLE",
      description: "CHALLENGES.RELIC_HUNTER.DESCRIPTION",
      goal: 1,
      reward: 50,
    ),
    Challenge(
      id: 3,
      key: ChallengeKey.wins,
      title: "CHALLENGES.SPILLED_BLOOD.TITLE",
      description: "CHALLENGES.SPILLED_BLOOD.DESCRIPTION",
      goal: 1,
      reward: 50,
    ),
    Challenge(
      id: 4,
      key: ChallengeKey.doorsInteracted,
      title: "CHALLENGES.DOOR_MASTER.TITLE",
      description: "CHALLENGES.DOOR_MASTER.DESCRIPTION",
      goal: 1,
      reward: 50,
    ),
  ];

  final fakeChallenge = Challenge(
      id: 5,
      key: ChallengeKey.doorsInteracted,
      title: "-",
      description: "-",
      goal: 1,
      reward: 0,
  );
}