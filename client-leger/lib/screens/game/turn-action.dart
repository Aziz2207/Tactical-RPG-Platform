import 'package:flutter/material.dart';

class TurnAction extends StatefulWidget {
  final String actionText;
  final String imagePath;
  final VoidCallback? onTap;
  final bool enabled;
  const TurnAction({
    super.key,
    required this.actionText,
    required this.imagePath,
    this.onTap,
    this.enabled = true,
  });

  @override
  State<TurnAction> createState() => _TurnActionState();
}

class _TurnActionState extends State<TurnAction> {
  @override
  Widget build(BuildContext context) {
    final bool isDisabled = !widget.enabled;

    return Column(
      children: [
        Text(
          widget.actionText,
          style: TextStyle(
            color: Color.fromRGBO(255, 255, 255, 1),
            fontSize: 16,
            fontFamily: 'Papyrus',
            fontWeight: FontWeight.bold,
          ),
        ),
        GestureDetector(
          onTap: isDisabled ? null : widget.onTap,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: Opacity(
              opacity: isDisabled ? 0.5 : 1.0,
              child: Image.asset(
                widget.imagePath,
                width: 80,
                height: 80,
                fit: BoxFit.cover,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
