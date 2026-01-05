import 'package:client_leger/interfaces/combat-players.dart';

class StartFightData {
  final CombatPlayers combatPlayers;
  final bool isActivePlayerAttacker;

  StartFightData({
    required this.combatPlayers,
    required this.isActivePlayerAttacker,
  });

  factory StartFightData.fromJson(Map<String, dynamic> json) {
    return StartFightData(
      combatPlayers: CombatPlayers.fromJson(json['combatPlayers']),
      isActivePlayerAttacker: json['isActivePlayerAttacker'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'combatPlayers': combatPlayers.toJson(),
      'isActivePlayerAttacker': isActivePlayerAttacker,
    };
  }
}
