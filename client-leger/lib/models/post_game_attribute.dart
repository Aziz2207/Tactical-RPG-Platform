class PostGameAttribute {
  final String id;
  final String key;
  final String displayText;
  final bool isGrouped;
  final List<String>? groupKeys;

  PostGameAttribute({
    required this.id,
    required this.key,
    required this.displayText,
    this.isGrouped = false,
    this.groupKeys,
  });
}

enum SortOrder { unsorted, ascending, descending }