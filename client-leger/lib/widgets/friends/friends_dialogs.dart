import 'package:flutter/material.dart';

Future<void> showSizedTransparentDialog({
  required BuildContext context,
  required Widget child,
  double width = 900,
  double height = 600,
  bool barrierDismissible = true,
}) async {
  await showDialog(
    context: context,
    barrierDismissible: barrierDismissible,
    builder: (context) {
      return Dialog(
        insetPadding: const EdgeInsets.all(20),
        backgroundColor: Colors.transparent,
        child: SizedBox(width: width, height: height, child: child),
      );
    },
  );
}
