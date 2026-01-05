import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/utils/theme/theme_config.dart';

class CombatStatsBar extends StatefulWidget {
  final Player player;
  final bool isOnRightSide;
  final bool isDamaged;

  const CombatStatsBar({
    Key? key,
    required this.player,
    required this.isOnRightSide,
    required this.isDamaged,
  }) : super(key: key);

  @override
  State<CombatStatsBar> createState() => _CombatStatsBarState();
}

class _CombatStatsBarState extends State<CombatStatsBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: Duration(milliseconds: 500),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void didUpdateWidget(CombatStatsBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isDamaged && !oldWidget.isDamaged) {
      _pulseController.forward().then((_) => _pulseController.reverse());
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  int _getCurrentHp() {
    return widget.player.attributes.currentHp;
  }

  int _getTotalHp() {
    return widget.player.attributes.totalHp;
  }

  int _getSpeed() {
    return widget.player.attributes.speed;
  }

  int _getAttack() {
    return widget.player.attributes.attack;
  }

  int _getDefense() {
    return widget.player.attributes.defense;
  }

  int _getAtkDiceMax() {
    return widget.player.attributes.atkDiceMax;
  }

  int _getDefDiceMax() {
    return widget.player.attributes.defDiceMax;
  }

  @override
  Widget build(BuildContext context) {
    final currentHp = _getCurrentHp();
    final totalHp = _getTotalHp();
    final hpPercentage = totalHp > 0 ? currentHp / totalHp : 0.0;

    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        return Container(
          padding: EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: widget.isOnRightSide
                ? CrossAxisAlignment.end
                : CrossAxisAlignment.start,
            children: [
              // Player Name
              AnimatedDefaultTextStyle(
                duration: Duration(milliseconds: 200),
                style: TextStyle(
                  fontFamily: 'Papyrus',
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: widget.isDamaged ? Color(0xFFf95e4d) : Colors.white,
                ),
                child: Text(
                  widget.player.name,
                  textAlign: widget.isOnRightSide
                      ? TextAlign.right
                      : TextAlign.left,
                ),
              ),
              SizedBox(height: 8),

              // HP Bar Container
              Row(
                mainAxisAlignment: widget.isOnRightSide
                    ? MainAxisAlignment.end
                    : MainAxisAlignment.start,
                children: widget.isOnRightSide
                    ? [
                        _buildHpValue(currentHp, totalHp, palette),
                        SizedBox(width: 8),
                        _buildHpBar(hpPercentage),
                      ]
                    : [
                        _buildHpBar(hpPercentage),
                        SizedBox(width: 8),
                        _buildHpValue(currentHp, totalHp, palette),
                      ],
              ),
              SizedBox(height: 4),

              // Stats Row
              Row(
                mainAxisAlignment: widget.isOnRightSide
                    ? MainAxisAlignment.end
                    : MainAxisAlignment.start,
                children: [
                  _buildStatText('GAME.SPD'.tr() + ' : ${_getSpeed()}', palette),
                  SizedBox(width: 8),
                  _buildStatText('GAME.ATK'.tr() + ' : ${_getAttack()}', palette),
                  SizedBox(width: 4),
                  _buildDiceIcon(_getAtkDiceMax()),
                  SizedBox(width: 8),
                  _buildStatText('GAME.DEF'.tr() + ' : ${_getDefense()}', palette),
                  SizedBox(width: 4),
                  _buildDiceIcon(_getDefDiceMax()),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHpBar(double percentage) {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: widget.isDamaged ? _pulseAnimation.value : 1.0,
          child: Transform(
            alignment: Alignment.center,
            transform: widget.isOnRightSide
                ? Matrix4.rotationY(3.14159)
                : Matrix4.identity(),
            child: Container(
              width: 400,
              height: 16,
              decoration: BoxDecoration(
                border: Border.all(color: Color(0xFFC5C5C5), width: 1),
                borderRadius: BorderRadius.circular(8),
                color: Color(0xFFC8C8C8),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(7),
                child: FractionallySizedBox(
                  alignment: Alignment.centerLeft,
                  widthFactor: percentage.clamp(0.0, 1.0),
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(0xFF331010),
                          Color(0xFF5D1414),
                          Color(0xFF8E1818),
                          Color(0xFFAF1010),
                        ],
                        stops: [0.0, 0.33, 0.67, 1.0],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildHpValue(int current, int total, ThemePalette palette) {
    return AnimatedDefaultTextStyle(
      duration: Duration(milliseconds: 200),
      style: TextStyle(
        fontFamily: 'Papyrus',
        fontSize: 18,
        fontWeight: FontWeight.w900,
        color: widget.isDamaged ? Color(0xFFf95e4d) : palette.primaryLight,
      ),
      child: AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: widget.isDamaged ? _pulseAnimation.value : 1.0,
            child: Text('$current / $total'),
          );
        },
      ),
    );
  }

  Widget _buildStatText(String text, ThemePalette palette) {
    return Text(
      text,
      style: TextStyle(
        fontFamily: 'Papyrus',
        fontSize: 16,
        fontWeight: FontWeight.w900,
        color: palette.primaryLight,
      ),
    );
  }

  Widget _buildDiceIcon(int diceMax) {
    return Image.asset(
      diceMax == 4
          ? 'assets/images/icones/D4.png'
          : 'assets/images/icones/D6.png',
      width: 22.4,
      height: 22.4,
    );
  }
}