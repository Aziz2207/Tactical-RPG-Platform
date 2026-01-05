import 'package:flutter/material.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/constants/inputs/input-decoration.dart';
import 'package:flutter/services.dart';

class CustomTextField extends StatelessWidget {
  final String hintText;
  final String? Function(String?) validator;
  final Function(String) onChanged;
  final bool obscureText;
  final int nMaxCharacter;
  final AutovalidateMode autovalidateMode;
  final void Function()? onSpaceTyped;
  final Widget? suffixIcon;
  final focusNode;

  const CustomTextField({
    super.key,
    required this.hintText,
    required this.validator,
    required this.onChanged,
    required this.nMaxCharacter,
    required this.focusNode,
    this.autovalidateMode = AutovalidateMode.disabled,
    this.obscureText = false,
    this.suffixIcon,
    this.onSpaceTyped,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      style: const TextStyle(
        color: Colors.white,
        fontFamily: FontFamily.PAPYRUS,
        fontWeight: FontWeight.bold,
      ),

      inputFormatters: [
        TextInputFormatter.withFunction((oldValue, newValue) {
          if (newValue.text.contains(' ') && onSpaceTyped != null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              onSpaceTyped!();
            });
          }
          String cleanText = newValue.text.replaceAll(' ', '');
          if (cleanText.length > nMaxCharacter) {
            cleanText = cleanText.substring(0, nMaxCharacter);
          }
          return TextEditingValue(
            text: cleanText,
            selection: TextSelection.collapsed(offset: cleanText.length),
          );
        }),
      ],
      cursorColor: Colors.white,
      obscureText: obscureText,
      decoration: textInputDecoration.copyWith(
        suffixIcon: this.suffixIcon,
        hintText: hintText,
        hintStyle: const TextStyle(
          fontFamily: FontFamily.PAPYRUS,
          fontWeight: FontWeight.bold,
          color: Color.fromARGB(255, 165, 165, 165),
        ),
      ),
      autovalidateMode: autovalidateMode,
      validator: validator,
      onChanged: onChanged,
    );
  }
}
