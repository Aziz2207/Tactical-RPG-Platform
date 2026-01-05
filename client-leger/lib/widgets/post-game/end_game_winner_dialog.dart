import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:easy_localization/easy_localization.dart';

class EndGameWinnerDialog extends StatelessWidget {
  final Map<String, dynamic> endGameData;
  final VoidCallback onClose;

  const EndGameWinnerDialog({
    Key? key,
    required this.endGameData,
    required this.onClose,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(15),  // ⬅ Rounded corners here
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.45,
                maxHeight: MediaQuery.of(context).size.height * 0.65,
              ),
            child: ThemedBackground(
              child: SizedBox(
                width: MediaQuery.of(context).size.width * 0.45,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      stops: palette.primaryGradientStops,
                      colors: palette.primaryGradientColors,
                    ),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(15),
                      topRight: Radius.circular(15),
                    ),
                  ),
                  child: Text(
                    "DIALOG.TITLE.END_GAME".tr(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Papyrus',
                      fontWeight: FontWeight.w900,
                      fontSize: 20,
                      color: palette.invertedTextColor,
                      shadows: const [
                        Shadow(
                          blurRadius: 3.0,
                          color: Color.fromRGBO(0, 0, 0, 0.3),
                          offset: Offset(1.0, 1.0),
                        ),
                      ],
                    ),
                  ),
                ),

                // Content
                Padding(
                  padding: const EdgeInsets.fromLTRB(80, 24, 80, 24),
                  child: Text(
                    "DIALOG.MESSAGE.WINNER_ANNOUNCED".tr(namedArgs: {'winner': endGameData['winner']?['name'] ?? 'Inconnu'}),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Papyrus',
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: palette.mainTextColor,
                    ),
                  ),
                ),

                // Winner Image Container
                if (endGameData['winner']?['avatar']?['src'] != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 48),
                    child: SizedBox(
                      width: double.infinity,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // Left leaf decoration
                          Image.asset(
                            'assets/images/leaves/leafL_light.webp',
                            height: 240,
                            errorBuilder: (context, error, stackTrace) =>
                                const SizedBox(height: 240, width: 80),
                          ),

                          // Winner avatar
                          Container(
                            height: 240,
                            width: 240,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(80),
                              border: Border.all(
                                color: palette.primary,
                                width: 3.2,
                              ),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(80),
                              child: Image.asset(
                                endGameData['winner']['avatar']['src'],
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) =>
                                    Icon(
                                  Icons.person,
                                  size: 120,
                                  color: palette.primary,
                                ),
                              ),
                            ),
                          ),

                          // Right leaf decoration
                          Image.asset(
                            'assets/images/leaves/leafR_light.webp',
                            height: 240,
                            errorBuilder: (context, error, stackTrace) =>
                                const SizedBox(height: 240, width: 80),
                          ),
                        ],
                      ),
                    ),
                  ),

                // Close button
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          onClose();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: palette.primary,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 48,
                            vertical: 12,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(28),
                          ),
                        ).copyWith(
                          backgroundColor: WidgetStateProperty.resolveWith<Color>((
                            Set<WidgetState> states,
                          ) {
                            if (states.contains(WidgetState.hovered)) {
                              return palette.primaryDark;
                            }
                            return palette.primary;
                          }),
                        ),
                        child: Text(
                          "DIALOG.CLOSE".tr(),
                          style: TextStyle(
                            fontFamily: 'Papyrus',
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            color: palette.invertedTextColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
              ),
            ),
          ),
        ));
      },
    );
  }
}

// Helper function pour afficher le dialog facilement
Future<void> showEndGameWinnerDialog(
  BuildContext context, {
  required Map<String, dynamic> endGameData,
  required VoidCallback onClose,
}) {
  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => EndGameWinnerDialog(
      endGameData: endGameData,
      onClose: onClose,
    ),
  );
}