import 'package:flutter/material.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';

class MenuActionButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  const MenuActionButton({
    Key? key,
    required this.text,
    required this.onPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) =>
      AppPrimaryButton(label: text, onPressed: onPressed);
}
