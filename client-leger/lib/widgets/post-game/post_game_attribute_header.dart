import 'package:client_leger/services/post-game/post_game_service.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/models/post_game_attribute.dart';
import 'package:easy_localization/easy_localization.dart';

class PostGameAttributeHeader extends StatefulWidget {
  final PostGameAttribute attribute;
  final PostGameSortOrder sortOrder;
  final VoidCallback onSort;
  final VoidCallback onSelect;

  const PostGameAttributeHeader({
    Key? key,
    required this.attribute,
    required this.sortOrder,
    required this.onSort,
    required this.onSelect,
  }) : super(key: key);

  @override
  State<PostGameAttributeHeader> createState() =>
      _PostGameAttributeHeaderState();
}

class _PostGameAttributeHeaderState extends State<PostGameAttributeHeader> {
  bool isHovered = false;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        return MouseRegion(
          onEnter: (_) => setState(() => isHovered = true),
          onExit: (_) => setState(() => isHovered = false),
          child: GestureDetector(
            onTap: widget.onSort,
            child: AnimatedContainer(
              duration: Duration(milliseconds: 300),
              transform: Matrix4.identity()..scale(isHovered ? 1.05 : 1.0),
              height: 80,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildSortIcon(palette),
                  SizedBox(height: 8),
                  Text(
                    widget.attribute.displayText.tr(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color:
                          isHovered ? palette.primary : palette.mainTextColor,
                      fontSize: isHovered ? 12.5 : 11.2,
                      fontFamily: 'Papyrus',
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSortIcon(ThemePalette palette) {
    IconData icon;
    switch (widget.sortOrder) {
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
      size: 28,
    );
  }
}