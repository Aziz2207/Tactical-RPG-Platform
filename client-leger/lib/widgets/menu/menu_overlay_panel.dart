import 'package:flutter/material.dart';

class MenuOverlayPanel extends StatelessWidget {
  const MenuOverlayPanel({
    super.key,
    required this.child,
    required this.onClose,
    required this.width,
  });

  final Widget child;
  final VoidCallback onClose;
  final double width; // absolute width in pixels

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      bottom: 0,
      right: 0,
      width: width,
      child: WillPopScope(
        onWillPop: () async {
          onClose();
          return false;
        },
        child: Container(color: Colors.black.withOpacity(0.8), child: child),
      ),
    );
  }
}
