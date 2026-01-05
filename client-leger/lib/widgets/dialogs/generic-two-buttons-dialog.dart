import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';

class GenericConfirmationDialog extends StatelessWidget {
  final String title;
  final String message;
  final String cancelText;
  final String confirmText;

  const GenericConfirmationDialog({
    super.key,
    required this.title,
    required this.message,
    required this.cancelText,
    required this.confirmText,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      backgroundColor: Colors.transparent,
      child: Align(
        alignment: Alignment.center,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: ValueListenableBuilder<ThemePalette>(
            valueListenable: ThemeConfig.palette,
            builder: (context, palette, _) {
              final headerGradient = LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: palette.primaryGradientColors,
                stops: palette.primaryGradientStops,
              );

              final panelColor = Color.alphaBlend(
                palette.primary.withValues(alpha: 0.06),
                palette.secondaryVeryDark.withValues(alpha: 0.94),
              );

              final borderColor = palette.mainTextColor.withValues(alpha: 0.15);

              return Container(
                decoration: BoxDecoration(
                  color: panelColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 1),
                  boxShadow: [
                    BoxShadow(
                      color: palette.secondaryDark.withValues(alpha: 0.6),
                      blurRadius: 14,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        gradient: headerGradient,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(12),
                          topRight: Radius.circular(12),
                        ),
                      ),
                      child: Text(
                        title,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: palette.invertedTextColor,
                          fontFamily: FontFamily.PAPYRUS,
                          fontWeight: FontWeight.w700,
                          fontSize: 20,
                        ),
                      ),
                    ),

                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 22, 24, 10),
                      child: Text(
                        message,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: palette.mainTextColor,
                          fontFamily: FontFamily.PAPYRUS,
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                      ),
                    ),

                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 6, 24, 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: palette.primary,
                              foregroundColor: palette.invertedTextColor,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 10,
                              ),
                              elevation: 2,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onPressed: () => Navigator.of(context).pop(true),
                            child: Text(
                              confirmText,
                              style: const TextStyle(
                                fontFamily: FontFamily.PAPYRUS,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),

                          const SizedBox(width: 20),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: palette.secondaryDark.withValues(
                                alpha: 0.85,
                              ),
                              foregroundColor: palette.mainTextColor,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 10,
                              ),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onPressed: () => Navigator.of(context).pop(false),
                            child: Text(
                              cancelText,
                              style: const TextStyle(
                                fontFamily: FontFamily.PAPYRUS,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

Future<bool> showGenericConfirmationDialog({
  required BuildContext context,
  required String title,
  required String message,
  required String cancelText,
  required String confirmText,
}) async {
  final result = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) => GenericConfirmationDialog(
      title: title.tr(),
      message: message.tr(),
      cancelText: cancelText.tr(),
      confirmText: confirmText.tr(),
    ),
  );

  return result ?? false;
}
