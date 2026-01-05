class CombatResult {
  final int total;
  final int diceValue;

  CombatResult({required this.total, required this.diceValue});
  factory CombatResult.fromJson(Map<String, dynamic> json) {
    return CombatResult(
      total: json['total'] ?? 0,
      diceValue: json['diceValue'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'total': total, 'diceValue': diceValue};
  }
}
