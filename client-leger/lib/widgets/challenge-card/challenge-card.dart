import 'package:client_leger/models/challenge.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:client_leger/utils/theme/theme_config.dart';

class ChallengeCard extends StatelessWidget {
  final Challenge challenge;
  final int currentValue;

  const ChallengeCard({
    Key? key,
    required this.challenge,
    required this.currentValue,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final progressPercentage = (currentValue / challenge.goal).clamp(0.0, 1.0);

    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        return Container(
          width: 288,
          decoration: BoxDecoration(
            gradient: palette.backgroundGradientColors != null
                ? LinearGradient(
                    begin: palette.backgroundGradientBegin ?? Alignment.topLeft,
                    end: palette.backgroundGradientEnd ?? Alignment.bottomRight,
                    colors: palette.backgroundGradientColors!,
                    stops: palette.backgroundGradientStops,
                  )
                : LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [palette.secondaryVeryDark, palette.secondaryDark],
                  ),
            border: Border.all(color: palette.primary, width: 2),
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: palette.primaryBoxShadow,
                blurRadius: 10,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                decoration: BoxDecoration(
                  color: palette.primary,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(6),
                    topRight: Radius.circular(6),
                  ),
                ),
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3.2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        challenge.title.tr(),
                        style: TextStyle(
                          color: palette.invertedTextColor,
                          fontFamily: FontFamily.PAPYRUS,
                          fontSize: 14.4,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    SizedBox(width: 1.6),
                    Text(
                      'POST_GAME_LOBBY.REWARD'.tr() + ': ${challenge.reward}\$',
                      style: TextStyle(
                        color: palette.invertedTextColor,
                        fontFamily: FontFamily.PAPYRUS,
                        fontSize: 14.4,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              // Body
              Padding(
                padding: EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Description
                    Text(
                      challenge.description.tr(
                        namedArgs: {'goal': challenge.goal.toString()},
                      ),
                      style: TextStyle(
                        color: palette.secondaryText,
                        fontFamily: FontFamily.PAPYRUS,
                        fontWeight: FontWeight.bold,
                        fontSize: 12.8,
                        height: 1.2,
                      ),
                    ),
                    SizedBox(height: 1.6),

                    // Progress section
                    Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'CHALLENGES.PROGRESS'.tr(),
                              style: TextStyle(
                                color: palette.primaryLight,
                                fontFamily: FontFamily.PAPYRUS,
                                fontSize: 12.8,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              '$currentValue/${challenge.goal}',
                              style: TextStyle(
                                color: palette.primary,
                                fontFamily: FontFamily.PAPYRUS,
                                fontSize: 14.4,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 3.2),

                        // Progress bar
                        Container(
                          height: 8,
                          decoration: BoxDecoration(
                            color: palette.secondaryVeryDark,
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                              color: palette.secondary,
                              width: 2,
                            ),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: FractionallySizedBox(
                                widthFactor: progressPercentage,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: palette.primary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
