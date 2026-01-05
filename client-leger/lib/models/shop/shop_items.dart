class ShopAvatarItem {
  final int id;
  final String name;
  final String imageUrl;
  final int price;
  final String title;
  final bool? isTaken;

  ShopAvatarItem({
    required this.id,
    required this.name,
    required this.imageUrl,
    required this.price,
    required this.title,
    this.isTaken,
  });
}

class ShopBackgroundItem {
  final String imageUrl;
  final int price;
  final String title;

  ShopBackgroundItem({
    required this.imageUrl,
    required this.price,
    required this.title,
  });
}

class ShopThemeItem {
  final int id;
  final String label;
  final int price;
  final bool owned;
  final String? colorClass;

  ShopThemeItem({
    required this.id,
    required this.label,
    required this.price,
    required this.owned,
    this.colorClass,
  });
}
