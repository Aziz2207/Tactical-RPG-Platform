import 'package:flutter/material.dart';

Widget BuildPositionButton({
  required bool state,
  required Function() onPressed,
  required IconData defaultIcon,
  required double right,
  required double bottom,
  bool showBadge = false,
}) {
  return Positioned(
    right: right,
    bottom: bottom,
    child: Stack(
      clipBehavior: Clip.none,
      children: [
        FloatingActionButton(
          backgroundColor: Colors.black,
          onPressed: onPressed,
          child: Icon(state ? Icons.close : defaultIcon, color: Colors.white),
        ),
        if (showBadge && !state)
          Positioned(
            right: -2,
            top: -2,
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black54,
                    blurRadius: 3,
                    offset: Offset(0, 1),
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}
