class Challenge {
  final int id;
  final ChallengeKey key;
  final String title;
  final String description;
  final int goal;
  final int reward;

  Challenge({
    required this.id,
    required this.key,
    required this.title,
    required this.description,
    required this.goal,
    required this.reward,
  });

  factory Challenge.fromJson(Map<String, dynamic> json) {
    return Challenge(
      id: json['id'] as int,
      key: _parseKey(json['key']),
      title: json['title'] as String,
      description: json['description'] as String,
      goal: json['goal'] as int,
      reward: json['reward'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'key': key.value,
      'title': title,
      'description': description,
      'goal': goal,
      'reward': reward,
    };
  }

  static ChallengeKey _parseKey(dynamic keyValue) {
    final keyStr = keyValue.toString();
    return ChallengeKey.values.firstWhere(
      (e) => e.value == keyStr,
      orElse: () => ChallengeKey.visitedTiles,
    );
  }
}

enum ChallengeKey {
  visitedTiles('explorer'),
  evasions('strategicRetreat'),
  items('relicHunter'),
  wins('spilledBlood'),
  doorsInteracted('doorMaster');

  final String value;
  const ChallengeKey(this.value);
}