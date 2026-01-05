import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class FeedbackDialog extends StatelessWidget {
  final String textMessage;
  const FeedbackDialog({super.key, required this.textMessage});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 560),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF2C2C2C),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Text(
                textMessage,
                softWrap: true,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: FontFamily.PAPYRUS,
                  color: Colors.white,
                  fontSize: 18,
                ),
              ),
            ),
            const SizedBox(width: 16),
            GestureDetector(
              onTap: () => Navigator.of(context, rootNavigator: true).pop(),
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                child: Text(
                  'DIALOG.CLOSE'.tr(),
                  style: TextStyle(
                    fontFamily: FontFamily.PAPYRUS,
                    color: Colors.pinkAccent,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
