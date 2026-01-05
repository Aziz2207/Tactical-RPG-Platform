import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class CombatInProgressIndicator extends StatefulWidget {
  const CombatInProgressIndicator({super.key});

  @override
  State<CombatInProgressIndicator> createState() =>
      _CombatInProgressIndicatorState();
}

class _CombatInProgressIndicatorState extends State<CombatInProgressIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _borderOpacity;
  late Animation<double> _textOpacity;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);

    _borderOpacity = Tween(begin: 1.0, end: 0.4).animate(_controller);
    _textOpacity = Tween(begin: 1.0, end: 0.5).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) {
        return Opacity(
          opacity: _textOpacity.value,
          child: Container(
            width: 180,
            height: 100,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [Color(0xFF121211), Color(0xFF282424)],
              ),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                width: 3,
                color: Color.lerp(
                  const Color.fromARGB(255, 249, 94, 77),
                  const Color.fromARGB(150, 252, 126, 112),
                  1 - _borderOpacity.value,
                )!,
              ),
            ),
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(
              "GAME.IN_COMBAT".tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: "Papyrus",
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: Color.fromARGB(255, 249, 94, 77),
              ),
            ),
          ),
        );
      },
    );
  }
}
