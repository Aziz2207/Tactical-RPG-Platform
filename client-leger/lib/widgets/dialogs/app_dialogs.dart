import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:easy_localization/easy_localization.dart';

class AppDialogs {
  static Future<void> showInfo({
    required BuildContext context,
    required String title,
    required String message,
    int durationMs = 2500,
    bool showOkButton = true,
    String okLabel = 'FOOTER.CONFIRM',
    bool barrierDismissible = false,
    VoidCallback? onOk,
  }) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (ctx) {
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
                  final borderColor = palette.mainTextColor.withValues(
                    alpha: 0.15,
                  );

                  return Container(
                    decoration: BoxDecoration(
                      color: panelColor,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor, width: 1),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.55),
                          blurRadius: 24,
                          spreadRadius: 2,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Header bar
                        Container(
                          decoration: BoxDecoration(
                            gradient: headerGradient,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(12),
                              topRight: Radius.circular(12),
                            ),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  title.tr(),
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: palette.invertedTextColor,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: FontFamily.PAPYRUS,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Message
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 16,
                          ),
                          child: Text(
                            message.tr(),
                            style: TextStyle(
                              color: palette.mainTextColor,
                              fontSize: 16,
                              height: 1.35,
                              fontFamily: FontFamily.PAPYRUS,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),

                        // OK action
                        // HANDLE LATER WITH TIMER WHEN INTEGRATION WITH TIMER WORKS
                        if (showOkButton)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            child: AppPrimaryButton(
                              height: 52,
                              label: okLabel.tr(),
                              fontSize: 17,
                              onPressed: () {
                                Navigator.of(ctx).pop();
                                if (onOk != null) onOk();
                              },
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
      },
    );
  }

  static Future<bool> showConfirm({
    required BuildContext context,
    required String title,
    required String message,
    String cancelLabel = 'FOOTER.CANCEL',
    String okLabel = 'FOOTER.CONFIRM',
    bool barrierDismissible = true,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (ctx) {
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
                  final borderColor = palette.mainTextColor.withValues(
                    alpha: 0.15,
                  );

                  return Container(
                    decoration: BoxDecoration(
                      color: panelColor,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor, width: 1),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.55),
                          blurRadius: 24,
                          spreadRadius: 2,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Header
                        Container(
                          decoration: BoxDecoration(
                            gradient: headerGradient,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(12),
                              topRight: Radius.circular(12),
                            ),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  title.tr(),
                                  style: TextStyle(
                                    color: palette.invertedTextColor,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: FontFamily.PAPYRUS,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Message
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 16,
                          ),
                          child: Text(
                            message.tr(),
                            style: TextStyle(
                              color: palette.mainTextColor,
                              fontSize: 16,
                              height: 1.35,
                              fontFamily: FontFamily.PAPYRUS,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),

                        // Actions
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextButton(
                                  onPressed: () => Navigator.of(ctx).pop(false),
                                  child: Text(
                                    cancelLabel.tr(),
                                    style: TextStyle(
                                      color: palette.mainTextColor.withValues(
                                        alpha: 0.85,
                                      ),
                                      fontFamily: FontFamily.PAPYRUS,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: AppPrimaryButton(
                                  height: 52,
                                  label: okLabel.tr(),
                                  fontSize: 17,
                                  onPressed: () => Navigator.of(ctx).pop(true),
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
      },
    );
    return result ?? false;
  }
}
