import 'package:flutter/material.dart';

class ThemeConfig {
  ThemeConfig._();

  static final ValueNotifier<Color> backgroundBaseColor = ValueNotifier<Color>(
    const Color.fromRGBO(255, 249, 144, 1), // default to gold primary
  );

  static final ValueNotifier<double> backgroundFadeStrength =
      ValueNotifier<double>(0.1);

  static final ValueNotifier<ThemePalette> palette =
      ValueNotifier<ThemePalette>(ThemePalette.gold());

  // Track current theme name to enable cycling/switching in UI
  static final ValueNotifier<String> currentThemeName = ValueNotifier<String>(
    'gold',
  );

  // Registry of all available themes (extendable)
  static final Map<String, ThemePalette Function()> _paletteRegistry = {
    'gold': ThemePalette.gold,
    'amethyst': ThemePalette.amethyst,
    'blue': ThemePalette.blue,
    'emerald': ThemePalette.emerald,
    'ruby': ThemePalette.ruby,
    'obsidian': ThemePalette.obsidian,
    'copper': ThemePalette.copper,
    'cyberpunk': ThemePalette.cyberpunk,
    'aqua': ThemePalette.aqua,
    'mcdonalds': ThemePalette.mcdonalds,
    'magenta': ThemePalette.magenta,
    'sapphire': ThemePalette.sapphire,
    'sapphire-crimson': ThemePalette.sapphireCrimson,
    'verdant-amethyst': ThemePalette.verdantAmethyst,
    'my-eyes-bleed': ThemePalette.myEyesBleed,
    'dark-flat': ThemePalette.darkFlat,
    'gold-flat': ThemePalette.goldFlat,
    'navy-flat': ThemePalette.navyFlat,
    'green-flat': ThemePalette.greenFlat,
    'red-flat': ThemePalette.redFlat,
    'arctic': ThemePalette.arctic,
    'total-dark': ThemePalette.totalDark,
    'silver': ThemePalette.silver,
    'crimson': ThemePalette.crimson,
    'pink': ThemePalette.pink,
    'green-blue': ThemePalette.greenBlue,
    'black-orange': ThemePalette.blackOrange,
  };

  static List<String> get availableThemeNames =>
      _paletteRegistry.keys.toList(growable: false);

  static void setPalette(ThemePalette newPalette) {
    palette.value = newPalette;
    backgroundBaseColor.value = newPalette.primary;
  }

  static void setPaletteByName(String name) {
    final f = _paletteRegistry[name];
    if (f != null) {
      final pal = f();
      setPalette(pal);
      currentThemeName.value = name;
    }
  }

  static ThemePalette? previewPaletteForName(String name) {
    String key = name.trim().toLowerCase();
    if (key.startsWith('theme.')) {
      key = key.substring(6);
    }
    key = key.replaceAll('_', '-'); // Convert underscores to hyphens
    
    final f = _paletteRegistry[key];
    return f != null ? f() : null;
  }
}

class ThemePalette {
  final Color mainTextColor;
  final Color invertedTextColor;

  final Color primaryLight;
  final Color primary;
  final Color primaryDark;
  final Color primaryVeryDark;
  final Color primaryText;
  final Color primaryBoxShadow;

  final Color secondaryVeryLight;
  final Color secondaryLight;
  final Color secondary;
  final Color secondaryDark;
  final Color secondaryVeryDark;
  final Color secondaryText;

  final List<Color> primaryGradientColors;
  final List<double> primaryGradientStops;

  final List<Color>? backgroundGradientColors;
  final List<double>? backgroundGradientStops;
  final Alignment? backgroundGradientBegin;
  final Alignment? backgroundGradientEnd;

  const ThemePalette({
    required this.mainTextColor,
    required this.invertedTextColor,
    required this.primaryLight,
    required this.primary,
    required this.primaryDark,
    required this.primaryVeryDark,
    required this.primaryText,
    required this.primaryBoxShadow,
    required this.secondaryVeryLight,
    required this.secondaryLight,
    required this.secondary,
    required this.secondaryDark,
    required this.secondaryVeryDark,
    required this.secondaryText,
    required this.primaryGradientColors,
    required this.primaryGradientStops,
    this.backgroundGradientColors,
    this.backgroundGradientStops,
    this.backgroundGradientBegin,
    this.backgroundGradientEnd,
  });

 factory ThemePalette.gold() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 253, 212, 1),
    primary: Color.fromRGBO(255, 249, 144, 1),
    primaryDark: Color.fromRGBO(186, 173, 111, 1),
    primaryVeryDark: Color.fromRGBO(90, 85, 61, 1),
    primaryText: Color.fromRGBO(255, 249, 144, 1),
    primaryBoxShadow: Color.fromRGBO(255, 244, 122, 0.6),
    secondaryVeryLight: Color.fromRGBO(200, 200, 200, 1),
    secondaryLight: Color.fromRGBO(150, 150, 150, 1),
    secondary: Color.fromRGBO(100, 100, 100, 1),
    secondaryDark: Color.fromRGBO(69, 69, 69, 1),
    secondaryVeryDark: Color.fromRGBO(40, 40, 40, 1),
    secondaryText: Color.fromRGBO(255, 253, 212, 1),
    primaryGradientColors: [
      Color.fromRGBO(130, 123, 46, 1),
      Color.fromRGBO(255, 246, 121, 1),
      Color.fromRGBO(255, 246, 121, 1),
      Color.fromRGBO(154, 147, 62, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(19, 19, 18, 1),
      Color.fromRGBO(54, 48, 48, 1),
      Color.fromRGBO(81, 76, 62, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.amethyst() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    // Purples
    primaryLight: Color.fromRGBO(233, 213, 255, 1), // #E9D5FF
    primary: Color.fromRGBO(192, 132, 252, 1), // #C084FC
    primaryDark: Color.fromRGBO(139, 92, 246, 1), // #8B5CF6
    primaryVeryDark: Color.fromRGBO(91, 33, 182, 1), // #5B21B6
    primaryText: Color.fromRGBO(216, 180, 254, 1), // #D8B4FE
    primaryBoxShadow: Color.fromRGBO(192, 132, 252, 0.55),
    // Greys (reuse)
    secondaryVeryLight: Color.fromRGBO(200, 200, 200, 1),
    secondaryLight: Color.fromRGBO(150, 150, 150, 1),
    secondary: Color.fromRGBO(100, 100, 100, 1),
    secondaryDark: Color.fromRGBO(69, 69, 69, 1),
    secondaryVeryDark: Color.fromRGBO(40, 40, 40, 1),
    secondaryText: Color.fromRGBO(233, 213, 255, 1),
    // Horizontal primary gradient
    primaryGradientColors: [
      Color.fromRGBO(109, 40, 217, 1), // #6D28D9
      Color.fromRGBO(192, 132, 252, 1), // #C084FC
      Color.fromRGBO(192, 132, 252, 1), // #C084FC
      Color.fromRGBO(91, 33, 182, 1), // #5B21B6
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(33, 22, 51, 1),
      Color.fromRGBO(45, 28, 70, 1),
      Color.fromRGBO(81, 56, 124, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.blue() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(210, 240, 255, 1),
    primary: Color.fromRGBO(140, 205, 255, 1),
    primaryDark: Color.fromRGBO(85, 150, 210, 1),
    primaryVeryDark: Color.fromRGBO(45, 90, 140, 1),
    primaryText: Color.fromRGBO(140, 205, 255, 1),
    primaryBoxShadow: Color.fromRGBO(120, 195, 255, 0.6),
    secondaryVeryLight: Color.fromRGBO(205, 215, 235, 1),
    secondaryLight: Color.fromRGBO(160, 175, 205, 1),
    secondary: Color.fromRGBO(115, 130, 165, 1),
    secondaryDark: Color.fromRGBO(75, 90, 120, 1),
    secondaryVeryDark: Color.fromRGBO(45, 55, 75, 1),
    secondaryText: Color.fromRGBO(210, 240, 255, 1),
    primaryGradientColors: [
      Color.fromRGBO(40, 100, 155, 1),
      Color.fromRGBO(120, 195, 255, 1),
      Color.fromRGBO(120, 195, 255, 1),
      Color.fromRGBO(70, 130, 185, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(15, 20, 35, 1),
      Color.fromRGBO(35, 45, 65, 1),
      Color.fromRGBO(58, 79, 104, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.emerald() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(180, 255, 210, 1),
    primary: Color.fromRGBO(100, 210, 150, 1),
    primaryDark: Color.fromRGBO(50, 120, 80, 1),
    primaryVeryDark: Color.fromRGBO(25, 60, 40, 1),
    primaryText: Color.fromRGBO(100, 210, 150, 1),
    primaryBoxShadow: Color.fromRGBO(80, 200, 130, 0.6),
    secondaryVeryLight: Color.fromRGBO(215, 235, 220, 1),
    secondaryLight: Color.fromRGBO(175, 200, 180, 1),
    secondary: Color.fromRGBO(120, 150, 125, 1),
    secondaryDark: Color.fromRGBO(85, 105, 85, 1),
    secondaryVeryDark: Color.fromRGBO(45, 60, 48, 1),
    secondaryText: Color.fromRGBO(180, 255, 210, 1),
    primaryGradientColors: [
      Color.fromRGBO(60, 130, 90, 1),
      Color.fromRGBO(85, 170, 125, 1),
      Color.fromRGBO(85, 170, 125, 1),
      Color.fromRGBO(45, 110, 80, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(19, 37, 19, 1),
      Color.fromRGBO(35, 55, 35, 1),
      Color.fromRGBO(45, 81, 50, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.ruby() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 170, 170, 1),
    primary: Color.fromRGBO(235, 70, 70, 1),
    primaryDark: Color.fromRGBO(140, 35, 35, 1),
    primaryVeryDark: Color.fromRGBO(70, 20, 20, 1),
    primaryText: Color.fromRGBO(235, 70, 70, 1),
    primaryBoxShadow: Color.fromRGBO(235, 80, 80, 0.6),
    secondaryVeryLight: Color.fromRGBO(230, 200, 200, 1),
    secondaryLight: Color.fromRGBO(200, 160, 160, 1),
    secondary: Color.fromRGBO(140, 100, 100, 1),
    secondaryDark: Color.fromRGBO(95, 70, 70, 1),
    secondaryVeryDark: Color.fromRGBO(45, 35, 35, 1),
    secondaryText: Color.fromRGBO(255, 170, 170, 1),
    primaryGradientColors: [
      Color.fromRGBO(160, 40, 40, 1),
      Color.fromRGBO(220, 64, 64, 1),
      Color.fromRGBO(220, 64, 64, 1),
      Color.fromRGBO(142, 36, 36, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(37, 18, 18, 1),
      Color.fromRGBO(86, 29, 29, 1),
      Color.fromRGBO(122, 27, 27, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.obsidian() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(190, 200, 210, 1),
    primary: Color.fromRGBO(161, 173, 199, 1),
    primaryDark: Color.fromRGBO(80, 90, 110, 1),
    primaryVeryDark: Color.fromRGBO(40, 45, 55, 1),
    primaryText: Color.fromRGBO(161, 173, 199, 1),
    primaryBoxShadow: Color.fromRGBO(110, 120, 140, 0.6),
    secondaryVeryLight: Color.fromRGBO(218, 225, 233, 1),
    secondaryLight: Color.fromRGBO(182, 189, 196, 1),
    secondary: Color.fromRGBO(110, 115, 120, 1),
    secondaryDark: Color.fromRGBO(70, 75, 80, 1),
    secondaryVeryDark: Color.fromRGBO(30, 32, 36, 1),
    secondaryText: Color.fromRGBO(190, 200, 210, 1),
    primaryGradientColors: [
      Color.fromRGBO(80, 94, 122, 1),
      Color.fromRGBO(122, 134, 159, 1),
      Color.fromRGBO(122, 134, 159, 1),
      Color.fromRGBO(91, 104, 122, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(8, 8, 10, 1),
      Color.fromRGBO(30, 34, 40, 1),
      Color.fromRGBO(50, 55, 65, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.copper() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 220, 170, 1),
    primary: Color.fromRGBO(215, 145, 75, 1),
    primaryDark: Color.fromRGBO(130, 80, 40, 1),
    primaryVeryDark: Color.fromRGBO(70, 40, 25, 1),
    primaryText: Color.fromRGBO(215, 145, 75, 1),
    primaryBoxShadow: Color.fromRGBO(215, 145, 75, 0.6),
    secondaryVeryLight: Color.fromRGBO(225, 205, 195, 1),
    secondaryLight: Color.fromRGBO(190, 170, 155, 1),
    secondary: Color.fromRGBO(140, 120, 100, 1),
    secondaryDark: Color.fromRGBO(95, 80, 65, 1),
    secondaryVeryDark: Color.fromRGBO(60, 50, 40, 1),
    secondaryText: Color.fromRGBO(255, 220, 170, 1),
    primaryGradientColors: [
      Color.fromRGBO(160, 95, 55, 1),
      Color.fromRGBO(215, 145, 75, 1),
      Color.fromRGBO(215, 145, 75, 1),
      Color.fromRGBO(130, 75, 40, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(28, 18, 8, 1),
      Color.fromRGBO(70, 45, 30, 1),
      Color.fromRGBO(140, 95, 60, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.cyberpunk() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 150, 255, 1),
    primary: Color.fromRGBO(255, 80, 200, 1),
    primaryDark: Color.fromRGBO(140, 30, 120, 1),
    primaryVeryDark: Color.fromRGBO(70, 20, 70, 1),
    primaryText: Color.fromRGBO(255, 80, 200, 1),
    primaryBoxShadow: Color.fromRGBO(255, 80, 200, 0.7),
    secondaryVeryLight: Color.fromRGBO(120, 255, 255, 1),
    secondaryLight: Color.fromRGBO(85, 240, 255, 1),
    secondary: Color.fromRGBO(74, 184, 201, 1),
    secondaryDark: Color.fromRGBO(30, 120, 140, 1),
    secondaryVeryDark: Color.fromRGBO(15, 65, 75, 1),
    secondaryText: Color.fromRGBO(255, 150, 255, 1),
    primaryGradientColors: [
      Color.fromRGBO(255, 30, 180, 1),
      Color.fromRGBO(255, 80, 200, 1),
      Color.fromRGBO(255, 104, 237, 1),
      Color.fromRGBO(255, 120, 240, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(5, 0, 18, 1),
      Color.fromRGBO(30, 5, 45, 1),
      Color.fromRGBO(18, 0, 40, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.aqua() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(196, 255, 245, 1),
    primary: Color.fromRGBO(100, 230, 210, 1),
    primaryDark: Color.fromRGBO(60, 170, 160, 1),
    primaryVeryDark: Color.fromRGBO(25, 90, 85, 1),
    primaryText: Color.fromRGBO(100, 230, 210, 1),
    primaryBoxShadow: Color.fromRGBO(88, 255, 220, 0.6),
    secondaryVeryLight: Color.fromRGBO(200, 240, 255, 1),
    secondaryLight: Color.fromRGBO(150, 210, 255, 1),
    secondary: Color.fromRGBO(100, 170, 255, 1),
    secondaryDark: Color.fromRGBO(38, 95, 170, 1),
    secondaryVeryDark: Color.fromRGBO(27, 68, 129, 1),
    secondaryText: Color.fromRGBO(196, 255, 245, 1),
    primaryGradientColors: [
      Color.fromRGBO(40, 140, 130, 1),
      Color.fromRGBO(100, 240, 220, 1),
      Color.fromRGBO(100, 240, 220, 1),
      Color.fromRGBO(50, 180, 150, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(15, 35, 37, 1),
      Color.fromRGBO(32, 63, 55, 1),
      Color.fromRGBO(63, 114, 101, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.mcdonalds() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 250, 150, 1),
    primary: Color.fromRGBO(255, 235, 59, 1),
    primaryDark: Color.fromRGBO(210, 160, 0, 1),
    primaryVeryDark: Color.fromRGBO(110, 80, 0, 1),
    primaryText: Color.fromRGBO(255, 235, 59, 1),
    primaryBoxShadow: Color.fromRGBO(255, 200, 0, 0.6),
    secondaryVeryLight: Color.fromRGBO(255, 190, 190, 1),
    secondaryLight: Color.fromRGBO(255, 130, 130, 1),
    secondary: Color.fromRGBO(230, 50, 50, 1),
    secondaryDark: Color.fromRGBO(160, 25, 25, 1),
    secondaryVeryDark: Color.fromRGBO(90, 15, 15, 1),
    secondaryText: Color.fromRGBO(255, 250, 150, 1),
    primaryGradientColors: [
      Color.fromRGBO(255, 180, 40, 1),
      Color.fromRGBO(255, 220, 60, 1),
      Color.fromRGBO(255, 245, 120, 1),
      Color.fromRGBO(255, 210, 60, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(80, 0, 0, 1),
      Color.fromRGBO(120, 0, 0, 1),
      Color.fromRGBO(160, 30, 0, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.magenta() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 210, 245, 1),
    primary: Color.fromRGBO(255, 110, 210, 1),
    primaryDark: Color.fromRGBO(190, 60, 140, 1),
    primaryVeryDark: Color.fromRGBO(100, 30, 80, 1),
    primaryText: Color.fromRGBO(255, 110, 210, 1),
    primaryBoxShadow: Color.fromRGBO(255, 100, 200, 0.6),
    secondaryVeryLight: Color.fromRGBO(240, 190, 255, 1),
    secondaryLight: Color.fromRGBO(210, 120, 255, 1),
    secondary: Color.fromRGBO(160, 60, 220, 1),
    secondaryDark: Color.fromRGBO(110, 40, 150, 1),
    secondaryVeryDark: Color.fromRGBO(60, 20, 90, 1),
    secondaryText: Color.fromRGBO(255, 210, 245, 1),
    primaryGradientColors: [
      Color.fromRGBO(150, 40, 100, 1),
      Color.fromRGBO(255, 140, 210, 1),
      Color.fromRGBO(255, 180, 230, 1),
      Color.fromRGBO(190, 60, 150, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(35, 20, 35, 1),
      Color.fromRGBO(65, 30, 65, 1),
      Color.fromRGBO(132, 40, 126, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.sapphire() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(185, 205, 255, 1),
    primary: Color.fromRGBO(95, 135, 255, 1),
    primaryDark: Color.fromRGBO(45, 65, 140, 1),
    primaryVeryDark: Color.fromRGBO(25, 35, 80, 1),
    primaryText: Color.fromRGBO(95, 135, 255, 1),
    primaryBoxShadow: Color.fromRGBO(95, 135, 255, 0.6),
    secondaryVeryLight: Color.fromRGBO(190, 200, 220, 1),
    secondaryLight: Color.fromRGBO(130, 140, 160, 1),
    secondary: Color.fromRGBO(85, 95, 120, 1),
    secondaryDark: Color.fromRGBO(55, 65, 90, 1),
    secondaryVeryDark: Color.fromRGBO(30, 35, 50, 1),
    secondaryText: Color.fromRGBO(185, 205, 255, 1),
    primaryGradientColors: [
      Color.fromRGBO(45, 65, 140, 1),
      Color.fromRGBO(95, 135, 255, 1),
      Color.fromRGBO(95, 135, 255, 1),
      Color.fromRGBO(50, 65, 110, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    backgroundGradientColors: [
      Color.fromRGBO(10, 15, 35, 1),
      Color.fromRGBO(25, 30, 60, 1),
      Color.fromRGBO(50, 65, 110, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  // =====================
  // Heavy client combos
  // =====================
  factory ThemePalette.sapphireCrimson() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 180, 190, 1),
    primary: Color.fromRGBO(255, 85, 110, 1),
    primaryDark: Color.fromRGBO(140, 35, 55, 1),
    primaryVeryDark: Color.fromRGBO(80, 20, 35, 1),
    primaryText: Color.fromRGBO(255, 85, 110, 1),
    primaryBoxShadow: Color.fromRGBO(255, 85, 110, 0.6),
    secondaryVeryLight: Color.fromRGBO(185, 205, 255, 1),
    secondaryLight: Color.fromRGBO(125, 155, 255, 1),
    secondary: Color.fromRGBO(85, 115, 230, 1),
    secondaryDark: Color.fromRGBO(50, 75, 160, 1),
    secondaryVeryDark: Color.fromRGBO(25, 35, 85, 1),
    secondaryText: Color.fromRGBO(255, 180, 190, 1),
    primaryGradientColors: [
      Color.fromRGBO(120, 35, 55, 1),
      Color.fromRGBO(255, 85, 110, 1),
      Color.fromRGBO(255, 85, 110, 1),
      Color.fromRGBO(120, 35, 55, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient-down (to bottom): 25,20,45 -> 55,25,65 (60%) -> 100,35,75
    backgroundGradientColors: [
      Color.fromRGBO(25, 20, 45, 1),
      Color.fromRGBO(55, 25, 65, 1),
      Color.fromRGBO(100, 35, 75, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.verdantAmethyst() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(215, 190, 255, 1),
    primary: Color.fromRGBO(170, 120, 255, 1),
    primaryDark: Color.fromRGBO(100, 70, 180, 1),
    primaryVeryDark: Color.fromRGBO(55, 35, 95, 1),
    primaryText: Color.fromRGBO(170, 120, 255, 1),
    primaryBoxShadow: Color.fromRGBO(170, 120, 255, 0.6),
    secondaryVeryLight: Color.fromRGBO(200, 255, 230, 1),
    secondaryLight: Color.fromRGBO(150, 255, 210, 1),
    secondary: Color.fromRGBO(90, 215, 170, 1),
    secondaryDark: Color.fromRGBO(50, 160, 120, 1),
    secondaryVeryDark: Color.fromRGBO(25, 100, 75, 1),
    secondaryText: Color.fromRGBO(215, 190, 255, 1),
    primaryGradientColors: [
      Color.fromRGBO(80, 50, 150, 1),
      Color.fromRGBO(170, 120, 255, 1),
      Color.fromRGBO(200, 155, 255, 1),
      Color.fromRGBO(90, 215, 170, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient-down (to bottom): 25,20,35 -> 50,35,75 (60%) -> 90,55,130
    backgroundGradientColors: [
      Color.fromRGBO(25, 20, 35, 1),
      Color.fromRGBO(50, 35, 75, 1),
      Color.fromRGBO(90, 55, 130, 1),
    ],
    backgroundGradientStops: [0.0, 0.6, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.myEyesBleed() => const ThemePalette(
    mainTextColor: Color.fromRGBO(0, 255, 0, 1), // lime
    invertedTextColor: Color.fromRGBO(255, 0, 255, 1), // magenta
    primaryLight: Color.fromRGBO(255, 0, 255, 1),
    primary: Color.fromRGBO(255, 255, 0, 1),
    primaryDark: Color.fromRGBO(0, 255, 255, 1),
    primaryVeryDark: Color.fromRGBO(255, 128, 0, 1),
    primaryText: Color.fromRGBO(255, 255, 0, 1),
    primaryBoxShadow: Color.fromRGBO(0, 255, 0, 0.8),
    secondaryVeryLight: Color.fromRGBO(0, 255, 128, 1),
    secondaryLight: Color.fromRGBO(255, 0, 64, 1),
    secondary: Color.fromRGBO(64, 0, 255, 1),
    secondaryDark: Color.fromRGBO(255, 128, 255, 1),
    secondaryVeryDark: Color.fromRGBO(0, 255, 255, 1),
    secondaryText: Color.fromRGBO(255, 0, 255, 1),
    primaryGradientColors: [
      Color.fromRGBO(255, 0, 0, 1),
      Color.fromRGBO(0, 255, 0, 1),
      Color.fromRGBO(0, 0, 255, 1),
      Color.fromRGBO(255, 0, 255, 1),
      Color.fromRGBO(255, 255, 0, 1),
    ],
    primaryGradientStops: [0.0, 0.25, 0.5, 0.75, 1.0],
  );

  factory ThemePalette.darkFlat() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(190, 200, 210, 1),
    primary: Color.fromRGBO(161, 173, 199, 1),
    primaryDark: Color.fromRGBO(80, 90, 110, 1),
    primaryVeryDark: Color.fromRGBO(40, 45, 55, 1),
    primaryText: Color.fromRGBO(161, 173, 199, 1),
    primaryBoxShadow: Color.fromRGBO(110, 120, 140, 0.6),
    secondaryVeryLight: Color.fromRGBO(170, 175, 180, 1),
    secondaryLight: Color.fromRGBO(140, 145, 150, 1),
    secondary: Color.fromRGBO(110, 115, 120, 1),
    secondaryDark: Color.fromRGBO(70, 75, 80, 1),
    secondaryVeryDark: Color.fromRGBO(30, 32, 36, 1),
    secondaryText: Color.fromRGBO(190, 200, 210, 1),
    primaryGradientColors: [
      Color.fromRGBO(80, 90, 110, 1),
      Color.fromRGBO(161, 173, 199, 1),
      Color.fromRGBO(161, 173, 199, 1),
      Color.fromRGBO(80, 90, 110, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient/down: rgb(30, 34, 40)
    backgroundGradientColors: [
      Color.fromRGBO(30, 34, 40, 1),
      Color.fromRGBO(30, 34, 40, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.goldFlat() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 253, 212, 1),
    primary: Color.fromRGBO(255, 249, 144, 1),
    primaryDark: Color.fromRGBO(186, 173, 111, 1),
    primaryVeryDark: Color.fromRGBO(90, 85, 61, 1),
    primaryText: Color.fromRGBO(255, 249, 144, 1),
    primaryBoxShadow: Color.fromRGBO(255, 244, 122, 0.6),
    secondaryVeryLight: Color.fromRGBO(200, 200, 200, 1),
    secondaryLight: Color.fromRGBO(150, 150, 150, 1),
    secondary: Color.fromRGBO(100, 100, 100, 1),
    secondaryDark: Color.fromRGBO(69, 69, 69, 1),
    secondaryVeryDark: Color.fromRGBO(40, 40, 40, 1),
    secondaryText: Color.fromRGBO(255, 253, 212, 1),
    primaryGradientColors: [
      Color.fromRGBO(186, 173, 111, 1),
      Color.fromRGBO(255, 249, 144, 1),
      Color.fromRGBO(255, 249, 144, 1),
      Color.fromRGBO(154, 147, 62, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient: rgb(37,33,30) -> background-gradient-down: rgb(43,39,36)
    backgroundGradientColors: [
      Color.fromRGBO(37, 33, 30, 1),
      Color.fromRGBO(43, 39, 36, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.navyFlat() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(150, 185, 255, 1),
    primary: Color.fromRGBO(100, 150, 255, 1),
    primaryDark: Color.fromRGBO(35, 65, 145, 1),
    primaryVeryDark: Color.fromRGBO(20, 35, 80, 1),
    primaryText: Color.fromRGBO(100, 150, 255, 1),
    primaryBoxShadow: Color.fromRGBO(70, 110, 255, 0.7),
    secondaryVeryLight: Color.fromRGBO(170, 180, 210, 1),
    secondaryLight: Color.fromRGBO(120, 135, 170, 1),
    secondary: Color.fromRGBO(85, 100, 140, 1),
    secondaryDark: Color.fromRGBO(45, 55, 85, 1),
    secondaryVeryDark: Color.fromRGBO(25, 30, 55, 1),
    secondaryText: Color.fromRGBO(150, 185, 255, 1),
    primaryGradientColors: [
      Color.fromRGBO(35, 65, 145, 1),
      Color.fromRGBO(100, 150, 255, 1),
      Color.fromRGBO(100, 150, 255, 1),
      Color.fromRGBO(45, 65, 110, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient: rgb(15,20,40) -> background-gradient-down: rgb(10,15,35)
    backgroundGradientColors: [
      Color.fromRGBO(15, 20, 40, 1),
      Color.fromRGBO(10, 15, 35, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.greenFlat() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(210, 255, 240, 1),
    primary: Color.fromRGBO(120, 230, 190, 1),
    primaryDark: Color.fromRGBO(60, 150, 120, 1),
    primaryVeryDark: Color.fromRGBO(35, 85, 65, 1),
    primaryText: Color.fromRGBO(120, 230, 190, 1),
    primaryBoxShadow: Color.fromRGBO(70, 200, 170, 0.6),
    secondaryVeryLight: Color.fromRGBO(190, 230, 210, 1),
    secondaryLight: Color.fromRGBO(150, 190, 170, 1),
    secondary: Color.fromRGBO(100, 145, 125, 1),
    secondaryDark: Color.fromRGBO(60, 95, 80, 1),
    secondaryVeryDark: Color.fromRGBO(35, 55, 45, 1),
    secondaryText: Color.fromRGBO(210, 255, 240, 1),
    primaryGradientColors: [
      Color.fromRGBO(60, 150, 120, 1),
      Color.fromRGBO(120, 230, 190, 1),
      Color.fromRGBO(120, 230, 190, 1),
      Color.fromRGBO(70, 110, 90, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient/down: rgb(19,46,37)
    backgroundGradientColors: [
      Color.fromRGBO(19, 46, 37, 1),
      Color.fromRGBO(19, 46, 37, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.redFlat() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 210, 210, 1),
    primary: Color.fromRGBO(245, 100, 100, 1),
    primaryDark: Color.fromRGBO(170, 50, 50, 1),
    primaryVeryDark: Color.fromRGBO(100, 25, 25, 1),
    primaryText: Color.fromRGBO(252, 124, 124, 1),
    primaryBoxShadow: Color.fromRGBO(255, 100, 100, 0.6),
    secondaryVeryLight: Color.fromRGBO(230, 210, 210, 1),
    secondaryLight: Color.fromRGBO(190, 140, 140, 1),
    secondary: Color.fromRGBO(140, 90, 90, 1),
    secondaryDark: Color.fromRGBO(90, 60, 60, 1),
    secondaryVeryDark: Color.fromRGBO(45, 30, 30, 1),
    secondaryText: Color.fromRGBO(255, 210, 210, 1),
    primaryGradientColors: [
      Color.fromRGBO(170, 50, 50, 1),
      Color.fromRGBO(245, 100, 100, 1),
      Color.fromRGBO(245, 100, 100, 1),
      Color.fromRGBO(110, 60, 60, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient/down: rgb(40,20,20)
    backgroundGradientColors: [
      Color.fromRGBO(40, 20, 20, 1),
      Color.fromRGBO(40, 20, 20, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.arctic() => const ThemePalette(
    mainTextColor: Colors.black,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 255, 255, 1),
    primary: Color(0xFF699CB4),
    primaryDark: Color.fromRGBO(160, 200, 230, 1),
    primaryVeryDark: Color.fromRGBO(122, 165, 198, 1),
    primaryText: Colors.black,
    primaryBoxShadow: Color.fromRGBO(200, 230, 255, 0.6),
    secondaryVeryLight: Color.fromRGBO(250, 255, 255, 1),
    secondaryLight: Color.fromRGBO(235, 245, 250, 1),
    secondary: Color.fromRGBO(210, 230, 245, 1),
    secondaryDark: Color.fromRGBO(175, 200, 220, 1),
    secondaryVeryDark: Color.fromRGBO(153, 179, 200, 1),
    secondaryText: Color(0xFF2F2F2F),
    primaryGradientColors: [
      Color.fromRGBO(160, 200, 230, 1),
      Color(0xFFB0C4CD),
      Color(0xFFB0C4CD),
      Color.fromRGBO(122, 165, 198, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background flat: rgb(230,240,250)
    backgroundGradientColors: [
      Color.fromRGBO(230, 240, 250, 1),
      Color.fromRGBO(230, 240, 250, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.totalDark() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.white,
    primaryLight: Color.fromRGBO(133, 140, 153, 1),
    primary: Color.fromRGBO(120, 130, 140, 1),
    primaryDark: Color.fromRGBO(35, 38, 45, 1),
    primaryVeryDark: Color.fromRGBO(20, 22, 26, 1),
    primaryText: Colors.white,
    primaryBoxShadow: Color.fromRGBO(0, 0, 0, 0.7),
    secondaryVeryLight: Color.fromRGBO(95, 100, 110, 1),
    secondaryLight: Color.fromRGBO(75, 80, 90, 1),
    secondary: Color.fromRGBO(55, 60, 70, 1),
    secondaryDark: Color.fromRGBO(35, 38, 45, 1),
    secondaryVeryDark: Color.fromRGBO(15, 16, 20, 1),
    secondaryText: Color.fromRGBO(133, 140, 153, 1),
    primaryGradientColors: [
      Color.fromRGBO(35, 38, 45, 1),
      Color.fromRGBO(120, 130, 140, 1),
      Color.fromRGBO(120, 130, 140, 1),
      Color.fromRGBO(25, 28, 32, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient: 15,17,20 -> background-gradient-down: 10,11,14
    backgroundGradientColors: [
      Color.fromRGBO(15, 17, 20, 1),
      Color.fromRGBO(10, 11, 14, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.silver() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(210, 215, 225, 1),
    primary: Color.fromRGBO(190, 195, 205, 1),
    primaryDark: Color.fromRGBO(120, 125, 135, 1),
    primaryVeryDark: Color.fromRGBO(90, 95, 105, 1),
    primaryText: Color.fromRGBO(190, 195, 205, 1),
    primaryBoxShadow: Color.fromRGBO(150, 150, 160, 0.5),
    secondaryVeryLight: Color.fromRGBO(200, 205, 210, 1),
    secondaryLight: Color.fromRGBO(170, 175, 185, 1),
    secondary: Color.fromRGBO(140, 145, 155, 1),
    secondaryDark: Color.fromRGBO(100, 105, 115, 1),
    secondaryVeryDark: Color.fromRGBO(70, 75, 80, 1),
    secondaryText: Color.fromRGBO(210, 215, 225, 1),
    primaryGradientColors: [
      Color.fromRGBO(120, 125, 135, 1),
      Color.fromRGBO(190, 195, 205, 1),
      Color.fromRGBO(190, 195, 205, 1),
      Color.fromRGBO(100, 105, 115, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background flat: rgb(71,75,82)
    backgroundGradientColors: [
      Color.fromRGBO(71, 75, 82, 1),
      Color.fromRGBO(71, 75, 82, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.crimson() => const ThemePalette(
    mainTextColor: Color(0xFFF8F3F3),
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 120, 120, 1),
    primary: Color.fromRGBO(220, 50, 50, 1),
    primaryDark: Color.fromRGBO(130, 10, 10, 1),
    primaryVeryDark: Color.fromRGBO(90, 5, 5, 1),
    primaryText: Color.fromRGBO(220, 50, 50, 1),
    primaryBoxShadow: Color.fromRGBO(180, 20, 20, 0.6),
    secondaryVeryLight: Color.fromRGBO(255, 160, 120, 1),
    secondaryLight: Color.fromRGBO(250, 110, 90, 1),
    secondary: Color.fromRGBO(230, 60, 60, 1),
    secondaryDark: Color.fromRGBO(160, 25, 25, 1),
    secondaryVeryDark: Color.fromRGBO(90, 10, 10, 1),
    secondaryText: Color.fromRGBO(255, 160, 120, 1),
    primaryGradientColors: [
      Color.fromRGBO(90, 20, 20, 1),
      Color.fromRGBO(220, 50, 50, 1),
      Color.fromRGBO(220, 50, 50, 1),
      Color.fromRGBO(130, 20, 20, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient-down: rgb(50,10,10) -> rgb(90,20,20)
    backgroundGradientColors: [
      Color.fromRGBO(50, 10, 10, 1),
      Color.fromRGBO(90, 20, 20, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.pink() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 180, 230, 1),
    primary: Color.fromRGBO(255, 105, 180, 1),
    primaryDark: Color.fromRGBO(180, 40, 120, 1),
    primaryVeryDark: Color.fromRGBO(100, 25, 70, 1),
    primaryText: Color.fromRGBO(255, 105, 180, 1),
    primaryBoxShadow: Color.fromRGBO(255, 105, 180, 0.6),
    secondaryVeryLight: Color.fromRGBO(255, 210, 230, 1),
    secondaryLight: Color.fromRGBO(255, 170, 210, 1),
    secondary: Color.fromRGBO(255, 130, 190, 1),
    secondaryDark: Color.fromRGBO(200, 70, 140, 1),
    secondaryVeryDark: Color.fromRGBO(120, 30, 80, 1),
    secondaryText: Color.fromRGBO(255, 180, 220, 1),
    primaryGradientColors: [
      Color.fromRGBO(180, 40, 120, 1),
      Color.fromRGBO(255, 105, 180, 1),
      Color.fromRGBO(255, 105, 180, 1),
      Color.fromRGBO(120, 30, 80, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient: 50,20,60 -> down: 30,10,40
    backgroundGradientColors: [
      Color.fromRGBO(50, 20, 60, 1),
      Color.fromRGBO(30, 10, 40, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.greenBlue() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(120, 255, 210, 1),
    primary: Color.fromRGBO(60, 230, 180, 1),
    primaryDark: Color.fromRGBO(20, 110, 90, 1),
    primaryVeryDark: Color.fromRGBO(10, 70, 60, 1),
    primaryText: Color.fromRGBO(60, 230, 180, 1),
    primaryBoxShadow: Color.fromRGBO(20, 90, 70, 0.6),
    secondaryVeryLight: Color.fromRGBO(80, 180, 250, 1),
    secondaryLight: Color.fromRGBO(50, 160, 240, 1),
    secondary: Color.fromRGBO(30, 130, 210, 1),
    secondaryDark: Color.fromRGBO(15, 90, 160, 1),
    secondaryVeryDark: Color.fromRGBO(10, 50, 90, 1),
    secondaryText: Color.fromRGBO(120, 255, 210, 1),
    primaryGradientColors: [
      Color.fromRGBO(20, 110, 90, 1),
      Color.fromRGBO(60, 230, 180, 1),
      Color.fromRGBO(60, 230, 180, 1),
      Color.fromRGBO(30, 130, 210, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient: 5,30,30 -> down: 5,20,40
    backgroundGradientColors: [
      Color.fromRGBO(5, 30, 30, 1),
      Color.fromRGBO(5, 20, 40, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );

  factory ThemePalette.blackOrange() => const ThemePalette(
    mainTextColor: Colors.white,
    invertedTextColor: Colors.black,
    primaryLight: Color.fromRGBO(255, 229, 191, 1),
    primary: Color.fromRGBO(255, 153, 0, 1),
    primaryDark: Color.fromRGBO(210, 110, 0, 1),
    primaryVeryDark: Color.fromRGBO(150, 70, 0, 1),
    primaryText: Color.fromRGBO(255, 153, 0, 1),
    primaryBoxShadow: Color.fromRGBO(255, 153, 0, 0.6),
    secondaryVeryLight: Color.fromRGBO(255, 229, 191, 1),
    secondaryLight: Color.fromRGBO(255, 160, 60, 1),
    secondary: Color.fromRGBO(230, 120, 20, 1),
    secondaryDark: Color.fromRGBO(138, 64, 7, 1),
    secondaryVeryDark: Color.fromRGBO(110, 50, 5, 1),
    secondaryText: Color.fromRGBO(255, 229, 191, 1),
    primaryGradientColors: [
      Color.fromRGBO(210, 110, 0, 1),
      Color.fromRGBO(255, 153, 0, 1),
      Color.fromRGBO(255, 153, 0, 1),
      Color.fromRGBO(138, 64, 7, 1),
    ],
    primaryGradientStops: [0.0, 0.35, 0.65, 1.0],
    // background-gradient: 10,10,10 -> down: 5,5,5
    backgroundGradientColors: [
      Color.fromRGBO(10, 10, 10, 1),
      Color.fromRGBO(5, 5, 5, 1),
    ],
    backgroundGradientStops: [0.0, 1.0],
    backgroundGradientBegin: Alignment.topCenter,
    backgroundGradientEnd: Alignment.bottomCenter,
  );
}
