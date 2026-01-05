class GameObject {
  final int id;
  final String name;
  final String image;
  final String description;

  const GameObject({
    required this.id,
    required this.name,
    required this.image,
    required this.description,
  });

  factory GameObject.fromJson(Map<String, dynamic> json) {
    return GameObject(
      id: json["id"],
      name: json["name"],
      image: json["image"],
      description: json["description"],
    );
  }

  Map<String, dynamic> toJson() {
    return {"id": id, "name": name, "image": image, "description": description};
  }
}
