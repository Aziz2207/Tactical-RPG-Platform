import 'package:client_leger/screens/authenticate/authenticate.dart';
import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/images/background_manager.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

Future<void> performLogoutFlow(BuildContext context) async {
  final confirmed =
      await showDialog<bool>(
        context: context,
        barrierDismissible: false,
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
                      palette.primary.withOpacity(0.06),
                      palette.secondaryVeryDark.withOpacity(0.94),
                    );
                    final borderColor = palette.mainTextColor.withOpacity(0.15);

                    return Container(
                      decoration: BoxDecoration(
                        color: panelColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: palette.secondaryDark.withOpacity(0.6),
                            blurRadius: 14,
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
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              gradient: headerGradient,
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(12),
                                topRight: Radius.circular(12),
                              ),
                            ),
                            child: Text(
                              'USER.LOG_OUT'.tr(),
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: palette.invertedTextColor,
                                fontFamily: FontFamily.PAPYRUS,
                                fontWeight: FontWeight.w700,
                                fontSize: 20,
                              ),
                            ),
                          ),

                          // Message
                          Padding(
                            padding: EdgeInsets.fromLTRB(24, 22, 24, 10),
                            child: Text(
                              'USER.LOG_OUT_MESSAGE'.tr(),
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: palette.mainTextColor,
                                fontFamily: FontFamily.PAPYRUS,
                                fontWeight: FontWeight.w700,
                                fontSize: 18,
                              ),
                            ),
                          ),

                          // Actions
                          Padding(
                            padding: const EdgeInsets.fromLTRB(24, 6, 24, 16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: palette.secondaryDark
                                        .withOpacity(0.85),
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
                                  onPressed: () => Navigator.of(ctx).pop(false),
                                  child: Text(
                                    'FOOTER.CANCEL'.tr(),
                                    style: TextStyle(
                                      fontFamily: FontFamily.PAPYRUS,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 20),
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
                                  onPressed: () => Navigator.of(ctx).pop(true),
                                  child: Text(
                                    'USER.LOG_OUT_CONFIRM'.tr(),
                                    style: TextStyle(
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
        },
      ) ??
      false;

  if (!confirmed) return;

  await ServiceLocator.userAccount.signOut();

  if (!context.mounted) return;
  try {
    await AppBackground.precache(context);
  } catch (_) {}

  if (!context.mounted) return;
  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => Authenticate()),
    (route) => false,
  );
}
