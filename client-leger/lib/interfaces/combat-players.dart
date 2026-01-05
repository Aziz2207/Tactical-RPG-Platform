import 'package:client_leger/interfaces/combat-result-details.dart';
import 'package:client_leger/interfaces/player.dart';

class CombatPlayers {
  final Player attacker;
  final Player defender;
  final CombatResultDetails? combatResultDetails;

  CombatPlayers({
    required this.attacker,
    required this.defender,
    this.combatResultDetails,
  });

  factory CombatPlayers.fromJson(Map<String, dynamic> json) {
    return CombatPlayers(
      attacker: Player.fromJson(json['attacker']),
      defender: Player.fromJson(json['defender']),
      combatResultDetails: json['combatResultDetails'] != null
          ? CombatResultDetails.fromJson(json['combatResultDetails'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'attacker': attacker.toJson(),
      'defender': defender.toJson(),
      if (combatResultDetails != null)
        'combatResultDetails': combatResultDetails!.toJson(),
    };
  }
}
