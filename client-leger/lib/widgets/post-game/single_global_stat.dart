import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/models/global_stat.dart';
import 'package:easy_localization/easy_localization.dart';

class SingleGlobalStat extends StatefulWidget {
  final GlobalStat globalStat;

  const SingleGlobalStat({Key? key, required this.globalStat})
      : super(key: key);

  @override
  State<SingleGlobalStat> createState() => _SingleGlobalStatState();
}

class _SingleGlobalStatState extends State<SingleGlobalStat> {
  bool isHovered = false;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        return MouseRegion(
          onEnter: (_) => setState(() => isHovered = true),
          onExit: (_) => setState(() => isHovered = false),
          child: AnimatedContainer(
            duration: Duration(milliseconds: 300),
            transform: Matrix4.identity()..scale(isHovered ? 1.05 : 1.0),
            padding: EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: isHovered
                  ? palette.primary.withOpacity(0.05)
                  : Colors.transparent,
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 6,
                  child: Text(
                    '${widget.globalStat.displayText.tr()}:',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.secondaryLight,
                      fontSize: 14,
                      fontFamily: 'Papyrus',
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: Text(
                    '${widget.globalStat.value}',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.mainTextColor,
                      fontSize: 18,
                      fontFamily: 'Papyrus',
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}