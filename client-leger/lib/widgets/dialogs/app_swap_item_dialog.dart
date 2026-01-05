import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';
import 'package:easy_localization/easy_localization.dart';

class AppSwapItemDialog {
  static Future<List<String>?> show({
    required BuildContext context,
    required String bigItemImage,
    required List<String> inventoryImages,
    String title = "DIALOG.TITLE.ITEM_EXCHANGE",
    bool barrierDismissible = false,
  }) {
    assert(inventoryImages.length == 2);

    String displayedBigImage = bigItemImage;
    List<String> tempInventory = [...inventoryImages];

    return showDialog<List<String>?>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setState) {
            return Dialog(
              insetPadding: const EdgeInsets.symmetric(horizontal: 24),
              backgroundColor: Colors.transparent,
              child: _buildSwapPanel(
                ctx: ctx,
                title: title.tr(),
                bigImage: displayedBigImage,
                inventoryImages: tempInventory,
                onSwap: (index) {
                  setState(() {
                    final oldBig = displayedBigImage;
                    displayedBigImage = tempInventory[index];
                    tempInventory[index] = oldBig;
                  });
                },
                onClose: () => Navigator.of(ctx).pop(tempInventory),
              ),
            );
          },
        );
      },
    );
  }

  static Widget _buildSwapPanel({
    required BuildContext ctx,
    required String title,
    required String bigImage,
    required List<String> inventoryImages,
    required void Function(int) onSwap,
    required VoidCallback onClose,
  }) {
    return Align(
      alignment: Alignment.center,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 450),
        child: ValueListenableBuilder(
          valueListenable: ThemeConfig.palette,
          builder: (_, palette, __) {
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

            return Container(
              decoration: BoxDecoration(
                color: panelColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: palette.mainTextColor.withValues(alpha: 0.15),
                  width: 1,
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      gradient: headerGradient,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(12),
                      ),
                    ),
                    padding: const EdgeInsets.all(14),
                    child: Center(
                      child: Text(
                        title.tr(),
                        style: TextStyle(
                          color: palette.invertedTextColor,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          fontFamily: FontFamily.PAPYRUS,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.asset(
                      bigImage,
                      width: 130,
                      height: 130,
                      fit: BoxFit.cover,
                    ),
                  ),

                  const SizedBox(height: 22),

                  Text(
                    "DIALOG.MESSAGE.CHOOSE_ITEM_TO_EXCHANGE".tr(),
                    style: TextStyle(
                      color: palette.mainTextColor,
                      fontFamily: FontFamily.PAPYRUS,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (int i = 0; i < 2; i++)
                        GestureDetector(
                          onTap: () => onSwap(i),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.asset(
                                inventoryImages[i],
                                width: 95,
                                height: 95,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),

                  const SizedBox(height: 26),

                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: AppPrimaryButton(
                      height: 48,
                      label: "DIALOG.CLOSE".tr(),
                      fontSize: 20,
                      onPressed: onClose,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
