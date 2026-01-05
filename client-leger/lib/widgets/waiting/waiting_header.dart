import 'package:flutter/material.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:easy_localization/easy_localization.dart';

class WaitingHeader extends StatelessWidget {
  final String roomCode;
  final String mapName;
  final String mode;
  final String availability; // 'public' | 'friends-only' | ''
  final int entryFee;
  final bool showBotAction;
  final VoidCallback? onAddBot;
  final bool isLocked;
  final ValueChanged<bool>? onLockChanged;
  final bool canToggleLock;
  final bool dropInEnabled;
  final ValueChanged<bool>? onDropInChanged;
  final bool? initialQuickElimination;

  const WaitingHeader({
    super.key,
    required this.roomCode,
    required this.mapName,
    this.mode = '',
    this.availability = '',
    this.entryFee = 0,
    this.showBotAction = false,
    this.onAddBot,
    this.isLocked = false,
    this.onLockChanged,
    this.canToggleLock = true,
    this.dropInEnabled = false,
    this.onDropInChanged,
    this.initialQuickElimination,
  });
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 2.0, left: 16.0, right: 16.0),
      child: SizedBox(
        width: double.infinity,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Wrap(
                alignment: WrapAlignment.start,
                spacing: 16,
                runSpacing: 8,
                children: [
                  if (mapName.isNotEmpty) _pill(text: mapName, highlight: true),
                  if (mode.isNotEmpty) _pill(text: mode.tr()),
                  if (availability.isNotEmpty)
                    _pill(text: _availabilityLabel(availability)),
                  if (!entryFee.isNaN) _pill(text: _entryFeeLabel(entryFee)),
                  if (initialQuickElimination == true)
                    _pill(
                      text: "GAME_CREATION.QUICK_ELIMINATION".tr(),
                      highlight: true,
                    ),
                  if (dropInEnabled)
                    _pill(text: "DropIn/DropOut", highlight: true),
                ],
              ),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (showBotAction)
                  Padding(
                    padding: const EdgeInsets.only(right: 4.0),
                    child: _botButton(onAddBot),
                  ),
                const SizedBox(width: 16),
                if (canToggleLock)
                  _lockControl(
                    isLocked: isLocked,
                    onChanged: canToggleLock ? onLockChanged : null,
                    enabled: canToggleLock,
                  ),
                const SizedBox(width: 16),
                if (showBotAction)
                  _dropInControl(
                    enabled: dropInEnabled,
                    onChanged: onDropInChanged,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _pill({required String text, bool highlight = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Text(
        text.tr(),
        style: TextStyle(
          color: highlight ? Colors.amber : Colors.white,
          fontSize: 17,
          fontFamily: FontFamily.PAPYRUS,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  String _availabilityLabel(String raw) {
    switch (raw) {
      case 'friends-only':
        return 'GAME_CREATION.FRIENDS_ONLY'.tr();
      case 'public':
        return 'GAME_CREATION.EVERYONE'.tr();
      default:
        return raw;
    }
  }

  String _entryFeeLabel(int fee) =>
      '${'GAME_CREATION.ENTRY_FEE'.tr()} : $fee\$';

  Widget _lockControl({
    required bool isLocked,
    ValueChanged<bool>? onChanged,
    bool enabled = true,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: enabled ? 0.35 : 0.2),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'WAITING_PAGE.LOCK'.tr(),
            style: const TextStyle(
              fontSize: 15,
              fontFamily: FontFamily.PAPYRUS,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 12),
          Switch(value: isLocked, onChanged: onChanged),
        ],
      ),
    );
  }

  Widget _botButton(VoidCallback? onPressed) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onPressed,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Colors.white24),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'WAITING_PAGE.ADD_BOT'.tr(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  fontFamily: FontFamily.PAPYRUS,
                ),
              ),
              const SizedBox(width: 8),
              Image.asset(
                "assets/images/icones/bot.png",
                width: 50,
                height: 50,
                fit: BoxFit.cover,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dropInControl({
    required bool enabled,
    ValueChanged<bool>? onChanged,
  }) {
    return GestureDetector(
      onTap: () => onChanged?.call(!enabled),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, anim) =>
                  ScaleTransition(scale: anim, child: child),
              child: Icon(
                enabled ? Icons.meeting_room : Icons.door_front_door,
                key: ValueKey(enabled),
                color: enabled ? Colors.greenAccent : Colors.redAccent,
                size: 24,
              ),
            ),

            const SizedBox(width: 10),

            Text(
              enabled
                  ? "SESSION_LIST.DROP_IN_ENABLED".tr()
                  : "SESSION_LIST.DROP_IN_DISABLED".tr(),
              style: const TextStyle(
                fontSize: 15,
                fontFamily: FontFamily.PAPYRUS,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),

            const SizedBox(width: 14),

            AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              width: 40,
              height: 22,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                color: enabled ? Colors.greenAccent : Colors.redAccent,
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOut,
                alignment: enabled
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
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
