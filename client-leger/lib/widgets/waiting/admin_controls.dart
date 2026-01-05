import 'package:flutter/material.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';
import 'package:easy_localization/easy_localization.dart';

class AdminControls extends StatelessWidget {
  final VoidCallback onStartGame;
  final double? startButtonFontSize;
  final MainAxisAlignment horizontalAlignment;

  const AdminControls({
    super.key,
    required this.onStartGame,
    this.startButtonFontSize,
    this.horizontalAlignment = MainAxisAlignment.end,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: horizontalAlignment,
            children: [
              AppPrimaryButton(
                label: 'WAITING_PAGE.START_GAME'.tr(),
                height: 56,
                fontSize: 20,
                onPressed: onStartGame,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
