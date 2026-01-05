import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';

class LeaderboardCell extends StatelessWidget {
  final String text;
  final int flex;
  final bool bold;
  final bool header;
  final bool sorted;
  final bool ascending;
  final VoidCallback? onTap;
  final bool usePrimaryColor;
  final Color? color;
  final Widget? below;
  final Widget? leading;

  const LeaderboardCell({
    super.key,
    required this.text,
    this.flex = 1,
    this.bold = false,
    this.header = false,
    this.sorted = false,
    this.ascending = false,
    this.onTap,
    this.usePrimaryColor = false,
    this.color,
    this.below,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    Widget label = ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        final baseStyle = TextStyle(
          color:
              color ??
              (usePrimaryColor ? palette.primary : palette.mainTextColor),
          fontFamily: 'Papyrus',
          fontWeight: bold || header ? FontWeight.w900 : FontWeight.w600,
          fontSize: header ? 22 : 20,
        );
        final textWidget = Text(
          _decorate(text),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: baseStyle,
        );
        Widget composed = textWidget;
        if (leading != null && !header) {
          composed = Row(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              leading!,
              const SizedBox(width: 16),
              Expanded(child: textWidget),
            ],
          );
        }
        if (below == null || header) return composed;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [composed, const SizedBox(height: 4), below!],
        );
      },
    );

    if (onTap != null) {
      label = InkWell(onTap: onTap, child: label);
    }

    return Expanded(flex: flex, child: label);
  }

  String _decorate(String t) {
    if (!header || !sorted) return t;
    return ascending ? '$t ↑' : '$t ↓';
  }
}
