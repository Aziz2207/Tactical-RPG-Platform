class LeaderboardUser {
  final String uid;
  final String? username;
  final String? email;
  final String? avatarURL;
  final int? lifetimeEarnings;

  final int? rank;
  final int totalGamesPlayed;
  final int wins;
  final double winRate; // 0..100
  final int totalGameDurationSeconds;

  const LeaderboardUser({
    required this.uid,
    this.username,
    this.email,
    this.avatarURL,
    this.lifetimeEarnings,
    this.rank,
    this.totalGamesPlayed = 0,
    this.wins = 0,
    this.winRate = 0.0,
    this.totalGameDurationSeconds = 0,
  });

  String get displayName => (username?.trim().isNotEmpty == true)
      ? username!.trim()
      : (email?.trim().isNotEmpty == true ? email!.trim() : uid);

  LeaderboardUser copyWith({
    String? uid,
    String? username,
    String? email,
    String? avatarURL,
    int? lifetimeEarnings,
    int? rank,
    int? totalGamesPlayed,
    int? wins,
    double? winRate,
    int? totalGameDurationSeconds,
  }) => LeaderboardUser(
    uid: uid ?? this.uid,
    username: username ?? this.username,
    email: email ?? this.email,
    avatarURL: avatarURL ?? this.avatarURL,
    lifetimeEarnings: lifetimeEarnings ?? this.lifetimeEarnings,
    rank: rank ?? this.rank,
    totalGamesPlayed: totalGamesPlayed ?? this.totalGamesPlayed,
    wins: wins ?? this.wins,
    winRate: winRate ?? this.winRate,
    totalGameDurationSeconds:
        totalGameDurationSeconds ?? this.totalGameDurationSeconds,
  );

  LeaderboardUser copyWithComputed(UserStats? s) {
    if (s == null) {
      return copyWith(
        totalGamesPlayed: 0,
        wins: 0,
        winRate: 0,
        totalGameDurationSeconds: 0,
      );
    }
    final totalGames = (s.numOfClassicPartiesPlayed + s.numOfCTFPartiesPlayed);
    final wins = s.numOfPartiesWon;
    final winRate = totalGames > 0 ? (wins / totalGames) * 100.0 : 0.0;
    final totalSeconds = s.gameDurationsForPlayer
        .fold<double>(0.0, (a, b) => a + b)
        .round();
    return copyWith(
      totalGamesPlayed: totalGames,
      wins: wins,
      winRate: double.parse(winRate.toStringAsFixed(2)),
      totalGameDurationSeconds: totalSeconds,
    );
  }

  factory LeaderboardUser.fromJson(Map<String, dynamic> j) {
    String id = (j['uid'] ?? '').toString();
    String? username = (j['username'] as String?);
    String? email = (j['email'] as String?);
    String? avatarURL = (j['avatarURL'] as String?);
    int? earnings;
    final rawEarn = j['lifetimeEarnings'];
    if (rawEarn is num) earnings = rawEarn.toInt();
    if (rawEarn is String) earnings = int.tryParse(rawEarn);

    return LeaderboardUser(
      uid: id,
      username: username,
      email: email,
      avatarURL: avatarURL,
      lifetimeEarnings: earnings,
    );
  }
}

class UserStats {
  final String uid;
  final int numOfClassicPartiesPlayed;
  final int numOfCTFPartiesPlayed;
  final int numOfPartiesWon;
  final List<double> gameDurationsForPlayer;

  const UserStats({
    required this.uid,
    required this.numOfClassicPartiesPlayed,
    required this.numOfCTFPartiesPlayed,
    required this.numOfPartiesWon,
    required this.gameDurationsForPlayer,
  });

  factory UserStats.fromJson(Map<String, dynamic> j) => UserStats(
    uid: (j['uid'] ?? '').toString(),
    numOfClassicPartiesPlayed: ((j['numOfClassicPartiesPlayed'] as num?) ?? 0)
        .toInt(),
    numOfCTFPartiesPlayed: ((j['numOfCTFPartiesPlayed'] as num?) ?? 0).toInt(),
    numOfPartiesWon: ((j['numOfPartiesWon'] as num?) ?? 0).toInt(),
    gameDurationsForPlayer: ((j['gameDurationsForPlayer'] as List?) ?? const [])
        .map<double>((e) {
          if (e is num) return e.toDouble();
          if (e is String) return double.tryParse(e) ?? 0.0;
          return 0.0;
        })
        .toList(),
  );
}
