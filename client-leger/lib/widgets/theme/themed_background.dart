import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';

class ThemedBackground extends StatelessWidget {
  final Widget child;

  const ThemedBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, pal, _) {
        final hasExplicit =
            pal.backgroundGradientColors != null &&
            pal.backgroundGradientColors!.isNotEmpty;
        Gradient backgroundGradient;
        if (hasExplicit) {
          backgroundGradient = LinearGradient(
            begin: pal.backgroundGradientBegin ?? Alignment.topCenter,
            end: pal.backgroundGradientEnd ?? Alignment.bottomCenter,
            colors: pal.backgroundGradientColors!,
            stops: pal.backgroundGradientStops,
          );
        } else {
          return ValueListenableBuilder<Color>(
            valueListenable: ThemeConfig.backgroundBaseColor,
            builder: (context, base, __) {
              return ValueListenableBuilder<double>(
                valueListenable: ThemeConfig.backgroundFadeStrength,
                builder: (context, fade, ___) {
                  final f = fade.clamp(0.0, 0.3);
                  final topMix = (0.24 + f * 0.04).clamp(0.0, 1.0);
                  final bottomMix = (0.45 + f * 0.03).clamp(0.0, 1.0);
                  final top = Color.lerp(Colors.black, base, topMix)!;
                  final bottom = Color.lerp(Colors.black, base, bottomMix)!;
                  final fallbackGradient = LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [top, bottom],
                  );
                  return _buildStack(fallbackGradient);
                },
              );
            },
          );
        }
        return _buildStack(backgroundGradient);
      },
    );
  }

  Widget _buildStack(Gradient backgroundGradient) {
    return Stack(
      children: [
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(gradient: backgroundGradient),
          ),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: const Alignment(0, 0.35),
                  colors: [Colors.black.withOpacity(0.12), Colors.transparent],
                  stops: const [0.0, 1.0],
                ),
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0, -0.3),
                  radius: 1.2,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.06),
                  ],
                  stops: const [0.6, 1.0],
                ),
              ),
            ),
          ),
        ),
        Positioned.fill(child: child),
      ],
    );
  }
}
