import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';

class AppPrimaryButton extends StatelessWidget {
  const AppPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.width,
    this.height = 60,
    this.padding = const EdgeInsets.symmetric(horizontal: 24),
    this.fontSize = 25,
  });

  final String label;
  final VoidCallback onPressed;
  final double? width;
  final double height;
  final EdgeInsetsGeometry padding;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        final borderRadius = BorderRadius.circular(100);
        final shadows = <BoxShadow>[
          BoxShadow(
            color: palette.primaryBoxShadow,
            blurRadius: 10,
            spreadRadius: 3,
            offset: const Offset(0, 0),
          ),
          BoxShadow(
            color: palette.secondaryDark.withValues(alpha: 0.8),
            blurRadius: 12,
            spreadRadius: 1,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: const Color(0xFFFFFFF0).withValues(alpha: 0.9),
            blurRadius: 4,
            spreadRadius: -4,
            offset: const Offset(0, -3),
          ),
        ];

        final decoration = BoxDecoration(
          gradient: LinearGradient(
            colors: palette.primaryGradientColors,
            stops: palette.primaryGradientStops,
            begin: const Alignment(-1, 0),
            end: const Alignment(1, 0),
          ),
          borderRadius: borderRadius,
          border: Border.all(color: palette.primaryLight, width: 2.0),
          boxShadow: shadows,
        );

        final button = Container(
          width: width ?? 320,
          height: height,
          decoration: decoration,
          alignment: Alignment.center,
          padding: padding,
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: FontFamily.PAPYRUS,
              color: palette.invertedTextColor,
              fontSize: fontSize,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.5,
            ),
          ),
        );

        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: borderRadius,
            onTap: onPressed,
            child: button,
          ),
        );
      },
    );
  }
}
