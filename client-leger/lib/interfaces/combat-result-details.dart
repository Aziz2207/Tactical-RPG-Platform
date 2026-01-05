import 'package:client_leger/models/combat_result.dart';

class CombatResultDetails {
  final CombatResult attackValues;
  final CombatResult defenseValues;

  CombatResultDetails({
    required this.attackValues,
    required this.defenseValues,
  });

  factory CombatResultDetails.fromJson(Map<String, dynamic> json) {
    return CombatResultDetails(
      attackValues: CombatResult.fromJson(json['attackValues'] ?? {}),
      defenseValues: CombatResult.fromJson(json['defenseValues'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'attackValues': attackValues.toJson(),
      'defenseValues': defenseValues.toJson(),
    };
  }
}
