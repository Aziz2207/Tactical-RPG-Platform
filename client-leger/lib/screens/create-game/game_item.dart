class GameItem {
  final String id;
  final String name;
  final String description;
  final String image;
  final int dimension;
  final String mode;
  final String state;
  final String lastModification;
  final Map<String, dynamic> raw;

  GameItem({
    required this.id,
    required this.name,
    required this.description,
    required this.image,
    required this.dimension,
    required this.mode,
    required this.state,
    required this.lastModification,
    required this.raw,
  });

  factory GameItem.fromJson(Map<String, dynamic> json) => GameItem(
    id: (json['_id'] ?? '').toString(),
    name: (json['name'] ?? '').toString(),
    description: (json['description'] ?? '').toString(),
    image: (json['image'] ?? '').toString(),
    dimension: (json['dimension'] ?? 0) is int
        ? (json['dimension'] as int)
        : int.tryParse(json['dimension']?.toString() ?? '0') ?? 0,
    mode: (json['mode'] ?? '').toString(),
    state: (json['state'] ?? '').toString(),
    lastModification: (json['lastModification'] ?? '').toString(),
    raw: json,
  );
}
