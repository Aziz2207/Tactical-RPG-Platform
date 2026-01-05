import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:flutter/material.dart';

class SearchBarWidget extends StatelessWidget {
  final TextEditingController controller;
  const SearchBarWidget({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      textAlign: TextAlign.center,
      cursorColor: Colors.white,
      style: const TextStyle(
        color: Colors.white,
        fontFamily: FontFamily.PAPYRUS,
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
      decoration: InputDecoration(
        hintText: "Nom de votre personnage",
        hintStyle: const TextStyle(
          fontFamily: FontFamily.PAPYRUS,
          color: Color.fromARGB(255, 252, 232, 174),
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.black,
      ),
      maxLength: 15,
      buildCounter:
          (_, {required currentLength, required isFocused, maxLength}) => null,
    );
  }
}
