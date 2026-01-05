import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/statistics/stat_action_button.dart';
import 'package:flutter/material.dart';

class StatRow extends StatelessWidget {
  final String label;
  final String buttonText;
  final dynamic value;
  final void Function() onPressed;
  final double spaceFromWordToNumber;
  final double spaceFromNumberToButton;
  final bool selected;

  const StatRow({
    super.key,
    required this.label,
    required this.buttonText,
    required this.value,
    required this.onPressed,
    required this.spaceFromWordToNumber,
    required this.spaceFromNumberToButton,
    this.selected = true,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                fontFamily: FontFamily.PAPYRUS,
              ),
            ),
            SizedBox(width: spaceFromWordToNumber),
            ValueListenableBuilder<ThemePalette>(
              valueListenable: ThemeConfig.palette,
              builder: (context, palette, _) => Text(
                value.toString(),
                style: TextStyle(
                  color: palette.primary,
                  fontFamily: FontFamily.PAPYRUS,
                  fontSize: 20,
                ),
              ),
            ),
            SizedBox(width: spaceFromNumberToButton),
            StatActionButton(
              buttonText: buttonText,
              onPressed: () => onPressed(),
              selected: selected,
            ),
          ],
        ),
      ],
    );
  }
}
