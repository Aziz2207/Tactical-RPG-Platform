import 'package:flutter/material.dart';
import 'dart:async';
import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/models/combat_result.dart';
import 'package:client_leger/services/combat/combat.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/combat/combat_stats_bar.dart';
import 'package:client_leger/widgets/combat/circular_timer_turn.dart';
import 'package:client_leger/widgets/combat/dice.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:easy_localization/easy_localization.dart';

class CombatModalWidget extends StatefulWidget {
  final VoidCallback onClose;
  final Function() onAttack;
  final Function() onEvade;
  final CombatService combatService;

  const CombatModalWidget({
    Key? key,
    required this.onClose,
    required this.onAttack,
    required this.onEvade,
    required this.combatService,
  }) : super(key: key);

  @override
  State<CombatModalWidget> createState() => _CombatModalWidgetState();
}

class _CombatModalWidgetState extends State<CombatModalWidget> {
  // late final Player activePlayer;
  // late final Player opponent;
  late CombatService _combatService;
  late StreamSubscription _combatTimeRemainingSub;
  // String turnMessage = "";
  int combatTurnTime = 5; // OU DYNAMIC ET VALEUR VIDE A VOIR

  StreamSubscription? _combatResultSub;

  StreamSubscription? _combatStatusSub;
  StreamSubscription? _opponentSub;

  @override
  void initState() {
    super.initState();
    _combatService = widget.combatService;
    _combatTimeRemainingSub = _combatService.combatTurnTimeStream.listen((
      time,
    ) {
      if (mounted) {
        setState(() {
          combatTurnTime = time;
        });
      }
    });

    _combatService.opponent$.listen((_) {
      if (mounted) setState(() {});
    });

    _combatService.turnMessage$.listen((_) {
      if (mounted) setState(() {});
    });

    _combatResultSub = _combatService.combatResultDetails$.listen((
      combatResult,
    ) {
      if (!mounted || combatResult == null) return;

      setState(() {
        final isActivePlayerAttacker = _combatService.isAttacker(
          _combatService.activePlayer,
        );

        if (isActivePlayerAttacker) {
          _combatService.activePlayerResult = combatResult.attackValues;
          _combatService.opponentResult = combatResult.defenseValues;
        } else {
          _combatService.activePlayerResult = combatResult.defenseValues;
          _combatService.opponentResult = combatResult.attackValues;
        }
      });
    });

    _combatService.canAttackOrEvade$.listen((_) {
      if (mounted) setState(() {});
    });

    _combatService.activePlayerInCombat$.listen((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _combatService.removeListeners();
    _combatTimeRemainingSub.cancel();
    _combatResultSub?.cancel();
    _combatStatusSub?.cancel();
    _opponentSub?.cancel();

    super.dispose();
  }

  String _getAvatarUrl(dynamic avatar) {
    if (avatar == null) return 'assets/images/icones/D4.png';
    if (avatar is String) return avatar;
    if (avatar is Map && avatar['src'] != null) return avatar['src'];
    return 'assets/images/icones/D4.png';
  }

  @override
  Widget build(BuildContext context) {
    final palette = ThemeConfig.palette.value;
    final size = MediaQuery.of(context).size;

    return ThemedBackground(
      child: Stack(
        children: [
          Column(
            children: [
              // Top Section (20%)
              Expanded(flex: 20, child: _buildTopSection(palette)),
              // Middle Section (50%)
              Expanded(flex: 50, child: _buildMiddleSection(palette)),
              // Bottom Section (30%)
              Expanded(flex: 30, child: _buildBottomSection(palette)),
            ],
          ),
          // Turn Message Overlay
          _buildTurnMessage(palette),
          // Close Button
          // Positioned(
          //   top: 10,
          //   right: 10,
          //   child: IconButton(
          //     icon: Icon(Icons.close, color: Colors.white, size: 24),
          //     onPressed: widget.onClose,
          //   ),
          // ),
        ],
      ),
    );
  }

  Widget _buildTurnMessage(ThemePalette palette) {
    return Positioned(
      top: MediaQuery.of(context).size.height * 0.155,
      left: 0,
      right: 0,
      child: Center(
        child: Container(
          width: MediaQuery.of(context).size.width * 0.5,
          height: MediaQuery.of(context).size.height * 0.1,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                palette.primary.withOpacity(0.9),
                palette.primary.withOpacity(0.9),
                Colors.transparent,
              ],
              stops: [0.0, 0.25, 0.75, 1.0],
            ),
            borderRadius: BorderRadius.circular(64),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 8,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              _combatService.turnMessage ?? "",
              style: TextStyle(
                fontFamily: 'Franklin Gothic Medium ',
                fontWeight: FontWeight.bold,
                fontSize: 24,
                color: Colors.black,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopSection(ThemePalette palette) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          flex: 35,
          child: CombatStatsBar(
            player: _combatService.activePlayer,
            isOnRightSide: false,
            isDamaged: !_combatService.isAttacker(_combatService.activePlayer),
          ),
        ),
        Expanded(
          flex: 20,
          child: CircularTimerTurnCombat(
            timeRemaining: combatTurnTime,
            isCurrentPlayer: true,
            activePlayerName:
                _combatService.isAttacker(_combatService.activePlayer)
                ? _combatService.activePlayer.name
                : _combatService.opponent.name,
            palette: palette,
          ),
        ),
        Expanded(
          flex: 35,
          child: CombatStatsBar(
            player: _combatService.opponent,
            isOnRightSide: true,
            isDamaged: !_combatService.isAttacker(_combatService.opponent),
          ),
        ),
      ],
    );
  }

  Widget _buildMiddleSection(ThemePalette palette) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildPlayerSection(
          _combatService.activePlayer,
          _combatService.evasionsActivePlayer,
          palette,
          isActive: _combatService.isAttacker(_combatService.activePlayer),
          isLeft: true,
        ),
        _buildDiceSection(_combatService.activePlayerResult),
        _buildDiceSection(_combatService.opponentResult),
        _buildPlayerSection(
          _combatService.opponent,
          _combatService.evasionsOpponent,
          palette,
          isActive: _combatService.isAttacker(_combatService.opponent),
          isLeft: false,
        ),
      ],
    );
  }

  Widget _buildPlayerSection(
    Player player,
    List<bool> evasions,
    ThemePalette palette, {
    required bool isActive,
    required bool isLeft,
  }) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 240,
          height: 240,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(48),
            border: Border.all(
              color: isActive ? Color(0xFFf95e4d) : Colors.white,
              width: 4.8,
            ),
            image: DecorationImage(
              image: AssetImage(_getAvatarUrl(player.avatar)),
              fit: BoxFit.cover,
            ),
          ),
        ),
        SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: evasions
              .map(
                (e) => Container(
                  width: 100,
                  height: 8,
                  margin: EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    color: palette.primary,
                    borderRadius: BorderRadius.circular(48),
                  ),
                ),
              )
              .toList(),
        ),
        SizedBox(height: 8),
        Text(
          'GAME.COMBAT.EVADE_POINTS_REMAINING'.tr() + ' ${evasions.length}',
          style: TextStyle(
            fontFamily: 'Papyrus',
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildDiceSection(CombatResult result) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.325,
      width: MediaQuery.of(context).size.width * 0.1,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 20, right: 30),
              child: Text(
                '${result.total}',
                style: TextStyle(
                  fontFamily: 'Papyrus',
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ),
          ),

          SizedBox(height: 30),
          DiceWidget(value: result.diceValue),
        ],
      ),
    );
  }

  Widget _buildBottomSection(ThemePalette palette) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        if (!_combatService.isLocalPlayerEliminated)
          _buildActionButton(
            label: 'GAME.COMBAT.EVADE',
            imagePath: 'assets/images/icones/evade.png',
            onPressed: () {
              _combatService.triggerEvade();
            },
            isEnabled: _combatService.canEvade(),
          ),
        Container(
          width: MediaQuery.of(context).size.width * 0.38,
          height: MediaQuery.of(context).size.height * 0.12,
          decoration: BoxDecoration(
            border: Border.all(color: palette.primary, width: 1.6),
            borderRadius: BorderRadius.circular(80),
          ),
          child: Center(
            child: Text(
              _combatService.combatStatus,
              style: TextStyle(
                fontFamily: 'Papyrus',
                fontSize: 20,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
        if (!_combatService.isLocalPlayerEliminated)
          _buildActionButton(
            label: 'GAME.COMBAT.ATTACK',
            imagePath: 'assets/images/icones/action.png',
            onPressed: () {
              _combatService.triggerAttack();
            },
            isEnabled: _combatService.canAttack(),
          ),
      ],
    );
  }

  Widget _buildActionButton({
    required String label,
    required String imagePath,
    required VoidCallback onPressed,
    required bool isEnabled,
  }) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          label.tr(),
          style: TextStyle(
            fontFamily: 'Papyrus',
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
        SizedBox(height: 8),
        GestureDetector(
          onTap: isEnabled ? onPressed : null,
          child: Opacity(
            opacity: isEnabled ? 1.0 : 0.35,
            child: Container(
              width: 144,
              height: 144,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.black, width: 1),
                gradient: LinearGradient(
                  colors: [
                    Color(0xFF272727),
                    Color(0xFF585858),
                    Color(0xFFa2a2a2),
                    Color(0xFFdcdcdc),
                  ],
                  begin: Alignment.bottomLeft,
                  end: Alignment.topRight,
                ),
              ),
              child: Center(
                child: Container(
                  width: 112,
                  height: 112,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.black, width: 1),
                    image: DecorationImage(
                      image: AssetImage(imagePath),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
