import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class GameCodeButton extends StatelessWidget {
  final TextEditingController controller;

  const GameCodeButton({Key? key, required this.controller}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final double fontSize = 38.0;
    final double hintFontSize = 20;
    final double letterSpacing = 16;
    final double borderRadius = 12;
    final double horizontalPadding = 16;
    final double verticalPadding = 8;

    final double cursorHeight = 25;
    final int maxCodeSize = 4;
    return Container(
      width: 260,
      height: 50,
      padding: EdgeInsets.symmetric(
        horizontal: horizontalPadding,
        vertical: verticalPadding,
      ),
      decoration: BoxDecoration(
        border: Border.all(color: Color.fromARGB(128, 135, 125, 79), width: 2),
        borderRadius: BorderRadius.circular(borderRadius),
        color: Colors.transparent,
      ),
      child: TextField(
        controller: controller,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        cursorHeight: cursorHeight,
        textAlignVertical: TextAlignVertical.center,
        maxLength: maxCodeSize,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: TextStyle(
          fontSize: fontSize,
          fontFamily: FontFamily.PAPYRUS,
          color: Colors.grey,
          letterSpacing: letterSpacing,
        ),
        cursorColor: Colors.white,
        decoration: InputDecoration(
          counterText: "",
          border: InputBorder.none,
          hintText: "X X X X",
          hintStyle: TextStyle(
            fontSize: hintFontSize,
            fontFamily: FontFamily.PAPYRUS,
            fontWeight: FontWeight.bold,
            color: Colors.grey,
            letterSpacing: letterSpacing,
          ),
        ),
      ),
    );
  }
}
