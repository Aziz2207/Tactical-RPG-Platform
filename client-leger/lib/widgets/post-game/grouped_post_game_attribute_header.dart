import 'package:client_leger/services/post-game/post_game_service.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/models/post_game_attribute.dart';
import 'package:easy_localization/easy_localization.dart';

class GroupedPostGameAttributeHeader extends StatefulWidget {
  final PostGameAttribute attribute;
  final Map<String, PostGameSortOrder> sortOrders;
  final Function(String) onSort;
  final VoidCallback onSelect;

  const GroupedPostGameAttributeHeader({
    Key? key,
    required this.attribute,
    required this.sortOrders,
    required this.onSort,
    required this.onSelect,
  }) : super(key: key);

  @override
  State<GroupedPostGameAttributeHeader> createState() =>
      _GroupedPostGameAttributeHeaderState();
}

class _GroupedPostGameAttributeHeaderState
    extends State<GroupedPostGameAttributeHeader> {
  bool isHovered = false;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        final groupKeys = widget.attribute.groupKeys ?? [];

        return MouseRegion(
          onEnter: (_) => setState(() => isHovered = true),
          onExit: (_) => setState(() => isHovered = false),
          child: Container(
            height: 80,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: groupKeys.map((key) {
                    final sortOrder =
                        widget.sortOrders[key] ?? PostGameSortOrder.unsorted;
                    return Padding(
                      padding: EdgeInsets.symmetric(horizontal: 2),
                      child: GestureDetector(
                        onTap: () => widget.onSort(key),
                        child: _buildMiniSortIcon(sortOrder, palette),
                      ),
                    );
                  }).toList(),
                ),
                SizedBox(height: 4),
                Text(
                  widget.attribute.displayText.tr(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isHovered ? palette.primary : palette.mainTextColor,
                    fontSize: isHovered ? 12.5 : 11.2,
                    fontFamily: 'Papyrus',
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMiniSortIcon(PostGameSortOrder sortOrder, ThemePalette palette) {
    IconData icon;
    switch (sortOrder) {
      case PostGameSortOrder.ascending:
        icon = Icons.arrow_upward;
        break;
      case PostGameSortOrder.descending:
        icon = Icons.arrow_downward;
        break;
      case PostGameSortOrder.unsorted:
      default:
        icon = Icons.unfold_more;
        break;
    }
    return Icon(
      icon,
      color: palette.mainTextColor.withOpacity(0.7),
      size: 24,
    );
  }
}
