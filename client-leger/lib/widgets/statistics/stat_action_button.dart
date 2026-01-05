import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';

class StatActionButton extends StatelessWidget {
  final String buttonText;
  final void Function() onPressed;

  final double buttonWidth = 40;
  final double buttonHeight = 13.0;
  final double fontSize;
  final double? minWidth;
  final double? minHeight;
  final bool selected;

  const StatActionButton({
    super.key,
    required this.buttonText,
    required this.onPressed,
    this.minWidth,
    this.minHeight,
    this.selected = true,
    this.fontSize = 13.0,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) => ElevatedButton(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.all(
            selected ? palette.primary : Colors.grey,
          ),
          textStyle: WidgetStateProperty.all(
            const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
          ),
          padding: WidgetStateProperty.all(
            const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          ),
          minimumSize: WidgetStateProperty.all(
            Size(minWidth ?? buttonWidth, minHeight ?? buttonHeight),
          ),
          side: WidgetStateProperty.resolveWith<BorderSide?>((
            Set<WidgetState> states,
          ) {
            if (states.contains(WidgetState.pressed)) {
              return BorderSide(color: palette.primaryDark, width: 2);
            }
            return null;
          }),
        ),
        onPressed: () {
          onPressed();
        },
        child: Text(
          buttonText,
          maxLines: 1,
          softWrap: false,
          overflow: TextOverflow.clip,
          style: TextStyle(
            fontFamily: FontFamily.PAPYRUS,
            fontWeight: FontWeight.bold,
            color: selected ? palette.invertedTextColor : Colors.white,
            fontSize: fontSize,
          ),
        ),
      ),
    );
  }
}
