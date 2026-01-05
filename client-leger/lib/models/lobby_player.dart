import 'package:client_leger/models/challenge.dart';

class LobbyPlayer {
  final String id;
  final String name;
  final String avatarPath;
  final bool isBot;
  final String status; // 'admin' | 'bot' | 'regular-player'
  final String behavior; // 'aggressive' | 'defensive' | 'sentient'
  final Challenge? assignedChallenge;

  const LobbyPlayer({
    required this.id,
    required this.name,
    required this.avatarPath,
    required this.isBot,
    required this.status,
    required this.behavior,
    this.assignedChallenge,
  });

  factory LobbyPlayer.fromServer(Map<String, dynamic> mp) {
    String avatarPath = '';
    final avatar = mp['avatar'];
    if (avatar is Map) {
      avatarPath = (avatar['src'] ?? '') as String;
    } else if (avatar is String) {
      avatarPath = avatar;
    }
    final status = (mp['status'] ?? '').toString().toLowerCase();
    final behavior = (mp['behavior'] ?? 'sentient').toString().toLowerCase();
 
    Challenge? assignedChallenge;
    final challengeData = mp['assignedChallenge'];
    if (challengeData != null && challengeData is Map<String, dynamic>) {
      assignedChallenge = Challenge.fromJson(challengeData);
    }
    
    return LobbyPlayer(
      id: (mp['id'] ?? '').toString(),
      name: (mp['name'] ?? '') as String,
      avatarPath: avatarPath,
      isBot: status == 'bot' || (mp['isBot'] == true),
      status: status,
      behavior: behavior,
      assignedChallenge: assignedChallenge,
    );
  }

  static List<LobbyPlayer> fromRoom(Map<String, dynamic> room) {
    final list = room['listPlayers'] as List? ?? const [];
    return list
        .map((p) => LobbyPlayer.fromServer(Map<String, dynamic>.from(p as Map)))
        .toList();
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'avatarPath': avatarPath,
      'isBot': isBot,
      'status': status,
      'behavior': behavior,
      'assignedChallenge': assignedChallenge?.toJson(),
    };
  }
}