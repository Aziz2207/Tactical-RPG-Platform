import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/widgets/feedback/feedback-dialog.dart';

class FeedbackService {
  static void show(BuildContext context, String message, {int duration = 2}) {
    // Show immediately (no await) to avoid using BuildContext across async gaps.
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (_, __, ___) => const SizedBox.shrink(),
      transitionBuilder: (_, anim, __, child) {
        return FadeTransition(
          opacity: anim,
          child: Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 60),
              child: FeedbackDialog(textMessage: message.tr()),
            ),
          ),
        );
      },
    );
    // Capture the navigator now to avoid using the BuildContext after an async gap.
    final navigator = Navigator.of(context, rootNavigator: true);
    Future.delayed(Duration(seconds: duration), () {
      if (navigator.canPop()) {
        navigator.pop();
      }
    });
  }

  static void showLong(
    BuildContext context,
    String message, {
    int duration = 5,
  }) {
    show(context, message, duration: duration);
  }
}
