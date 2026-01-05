import 'package:client_leger/widgets/statistics/stat_action_button.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class PlayerCreationStatistic extends StatefulWidget {
  const PlayerCreationStatistic({super.key});
  @override
  State<PlayerCreationStatistic> createState() =>
      PlayerCreationStatisticState();
}

class PlayerCreationStatisticState extends State<PlayerCreationStatistic> {
  int maxStatValue = 6;
  int minStatValue = 4;
  int lifeValue = 4;
  int speedValue = 4;
  String attackValue = "4";
  String defenseValue = "4";
  bool isSpeedOrLifeSelected = false;
  bool isAttackOrDefenseSelected = false;

  bool get areStatsValid => isSpeedOrLifeSelected && isAttackOrDefenseSelected;

  void incrementLifeValue() {
    setState(() {
      if (lifeValue == maxStatValue) return;
      lifeValue += 2;
      isSpeedOrLifeSelected = true;
    });
  }

  void decrementLifeValue() {
    setState(() {
      if (lifeValue == minStatValue) return;
      lifeValue -= 2;
      isSpeedOrLifeSelected = true;
    });
  }

  void incrementSpeedValue() {
    setState(() {
      if (speedValue == maxStatValue) return;
      speedValue += 2;
      isSpeedOrLifeSelected = true;
    });
  }

  void decrementSpeedValue() {
    setState(() {
      if (speedValue == minStatValue) return;
      speedValue -= 2;
      isSpeedOrLifeSelected = true;
    });
  }

  void setAttackValueD4() {
    setState(() {
      attackValue = "4 + (1-4)";
      defenseValue = "4 + (1-6)";
      isAttackOrDefenseSelected = true;
    });
  }

  void setAttackValueD6() {
    setState(() {
      attackValue = "4 + (1-6)";
      defenseValue = "4 + (1-4)";
      isAttackOrDefenseSelected = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    const double labelWidth = 100;
    const double valueWidth = 100;
    const double buttonWidth = 80;
    const double gap = 12;

    TextStyle labelStyle = const TextStyle(
      color: Colors.white,
      fontSize: 14,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.PAPYRUS,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 110),
      child: Column(
        children: [
          Row(
            children: [
              SizedBox(
                width: labelWidth,
                child: Text('ATTRIBUTES.HEALTH'.tr(), style: labelStyle),
              ),
              SizedBox(width: gap),
              SizedBox(
                width: valueWidth,
                child: ValueListenableBuilder<ThemePalette>(
                  valueListenable: ThemeConfig.palette,
                  builder: (context, palette, _) => Text(
                    lifeValue.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.primary,
                      fontFamily: FontFamily.PAPYRUS,
                      fontSize: 20,
                    ),
                  ),
                ),
              ),
              SizedBox(width: buttonWidth),
              SizedBox(width: gap),
              SizedBox(
                width: buttonWidth,
                child: StatActionButton(
                  buttonText: '+2',
                  onPressed: () {
                    decrementSpeedValue();
                    incrementLifeValue();
                  },
                  selected: lifeValue == maxStatValue,
                ),
              ),
            ],
          ),
          Row(
            children: [
              SizedBox(
                width: labelWidth,
                child: Text('ATTRIBUTES.SPEED'.tr(), style: labelStyle),
              ),
              SizedBox(width: gap),
              SizedBox(
                width: valueWidth,
                child: ValueListenableBuilder<ThemePalette>(
                  valueListenable: ThemeConfig.palette,
                  builder: (context, palette, _) => Text(
                    speedValue.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.primary,
                      fontFamily: FontFamily.PAPYRUS,
                      fontSize: 20,
                    ),
                  ),
                ),
              ),
              SizedBox(width: buttonWidth),
              SizedBox(width: gap),
              SizedBox(
                width: buttonWidth,
                child: StatActionButton(
                  buttonText: '+2',
                  onPressed: () {
                    decrementLifeValue();
                    incrementSpeedValue();
                  },
                  selected: speedValue == maxStatValue,
                ),
              ),
            ],
          ),
          Row(
            children: [
              SizedBox(
                width: labelWidth,
                child: Text('ATTRIBUTES.ATTACK'.tr(), style: labelStyle),
              ),
              SizedBox(width: gap),
              SizedBox(
                width: valueWidth,
                child: ValueListenableBuilder<ThemePalette>(
                  valueListenable: ThemeConfig.palette,
                  builder: (context, palette, _) => Text(
                    attackValue,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.primary,
                      fontFamily: FontFamily.PAPYRUS,
                      fontSize: 20,
                    ),
                  ),
                ),
              ),
              SizedBox(
                width: buttonWidth,
                child: StatActionButton(
                  buttonText: '+D4',
                  onPressed: () {
                    setAttackValueD4();
                  },
                  selected: attackValue.contains('(1-4)'),
                ),
              ),
              SizedBox(width: gap),
              SizedBox(
                width: buttonWidth,
                child: StatActionButton(
                  buttonText: '+D6',
                  onPressed: () {
                    setAttackValueD6();
                  },
                  selected: attackValue.contains('(1-6)'),
                ),
              ),
            ],
          ),
          Row(
            children: [
              SizedBox(
                width: labelWidth,
                child: Text('ATTRIBUTES.DEFENSE'.tr(), style: labelStyle),
              ),
              SizedBox(width: gap),
              SizedBox(
                width: valueWidth,
                child: ValueListenableBuilder<ThemePalette>(
                  valueListenable: ThemeConfig.palette,
                  builder: (context, palette, _) => Text(
                    defenseValue,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.primary,
                      fontFamily: FontFamily.PAPYRUS,
                      fontSize: 20,
                    ),
                  ),
                ),
              ),
              SizedBox(
                width: buttonWidth,
                child: StatActionButton(
                  buttonText: '+D4',
                  onPressed: () {
                    setAttackValueD6();
                  },
                  selected: defenseValue.contains('(1-4)'),
                ),
              ),
              SizedBox(width: gap),
              SizedBox(
                width: buttonWidth,
                child: StatActionButton(
                  buttonText: '+D6',
                  onPressed: () {
                    setAttackValueD4();
                  },
                  selected: defenseValue.contains('(1-6)'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}