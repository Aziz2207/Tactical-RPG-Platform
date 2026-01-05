class Position {
  final int x;
  final int y;

  const Position({required this.x, required this.y});

  factory Position.fromJson(Map<String, dynamic> json) {
    return Position(x: json['x'], y: json['y']);
  }

  Map<String, dynamic> toJson() => {"x": x, "y": y};

  @override
  String toString() => 'Positions(x: $x, y: $y)';
}
