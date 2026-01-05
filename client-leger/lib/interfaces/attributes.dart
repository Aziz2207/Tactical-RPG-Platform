class Attributes {
  final int initialHp;
  final int initialSpeed;
  final int initialAttack;
  final int initialDefense;

  final int totalHp;
  int currentHp;
  final int speed;
  int movementPointsLeft;
  final int maxActionPoints;
  int actionPoints;
  int attack;
  final int atkDiceMax;
  int defense;
  final int defDiceMax;
  int evasion;

  Attributes({
    required this.initialHp,
    required this.initialSpeed,
    required this.initialAttack,
    required this.initialDefense,
    required this.totalHp,
    required this.currentHp,
    required this.speed,
    required this.movementPointsLeft,
    required this.maxActionPoints,
    required this.actionPoints,
    required this.attack,
    required this.atkDiceMax,
    required this.defense,
    required this.defDiceMax,
    required this.evasion,
  });

  factory Attributes.fromJson(Map<String, dynamic> json) {
    return Attributes(
      initialHp: json['initialHp'],
      initialSpeed: json['initialSpeed'],
      initialAttack: json['initialAttack'],
      initialDefense: json['initialDefense'],
      totalHp: json['totalHp'],
      currentHp: json['currentHp'],
      speed: json['speed'],
      movementPointsLeft: json['movementPointsLeft'],
      maxActionPoints: json['maxActionPoints'],
      actionPoints: json['actionPoints'],
      attack: json['attack'],
      atkDiceMax: json['atkDiceMax'],
      defense: json['defense'],
      defDiceMax: json['defDiceMax'],
      evasion: json['evasion'],
    );
  }

  Map<String, dynamic> toJson() => {
    "initialHp": initialHp,
    "initialSpeed": initialSpeed,
    "initialAttack": initialAttack,
    "initialDefense": initialDefense,
    "totalHp": totalHp,
    "currentHp": currentHp,
    "speed": speed,
    "movementPointsLeft": movementPointsLeft,
    "maxActionPoints": maxActionPoints,
    "actionPoints": actionPoints,
    "attack": attack,
    "atkDiceMax": atkDiceMax,
    "defense": defense,
    "defDiceMax": defDiceMax,
    "evasion": evasion,
  };

  factory Attributes.empty() {
    return Attributes(
      initialHp: 0,
      initialSpeed: 0,
      initialAttack: 0,
      initialDefense: 0,
      totalHp: 0,
      currentHp: 0,
      speed: 0,
      movementPointsLeft: 0,
      maxActionPoints: 0,
      actionPoints: 0,
      attack: 0,
      atkDiceMax: 0,
      defense: 0,
      defDiceMax: 0,
      evasion: 0,
    );
  }
}
