import 'package:flutter/material.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';

class FriendsActionButton extends StatelessWidget {
  const FriendsActionButton({
    super.key,
    required this.label,
    required this.isPressed,
    required this.onTap,
    required this.onHighlightChanged,
    this.width,
    this.fontSize,
  });

  final String label;
  final bool isPressed;
  final VoidCallback onTap;
  final ValueChanged<bool> onHighlightChanged;
  final double? width;
  final double? fontSize;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOutCubic,
      scale: isPressed ? 0.94 : 1.0,
      child: Stack(
        children: [
          AppPrimaryButton(
            label: label,
            onPressed: onTap,
            height: 54,
            width: width ?? double.infinity,
            fontSize: fontSize ?? 25,
          ),
          if (isPressed)
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
