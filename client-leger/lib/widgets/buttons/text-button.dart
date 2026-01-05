import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:flutter/material.dart';

class TextButtonWidget extends StatelessWidget {
  final String text;
  final double fontSize;
  final Function onPressed;
  const TextButtonWidget({
    required this.text,
    required this.fontSize,
    required this.onPressed,
  });
  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () {
        onPressed();
      },
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
          if (states.contains(WidgetState.pressed)) {
            return const Color.fromARGB(255, 255, 249, 144);
          }
          return null;
        }),
        foregroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
          if (states.contains(WidgetState.pressed)) {
            return Colors.black;
          }
          return Colors.white;
        }),
        minimumSize: WidgetStateProperty.all(const Size(200, 50)),
        padding: WidgetStateProperty.all(
          const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
        shape: WidgetStateProperty.all<RoundedRectangleBorder>(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
        ),
      ),

      child: Text(
        text,
        style: TextStyle(
          fontFamily: FontFamily.PAPYRUS,
          fontWeight: FontWeight.bold,
          fontSize: fontSize,
        ),
      ),
    );
  }
}
