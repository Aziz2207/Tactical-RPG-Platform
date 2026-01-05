import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/services/authentification/logout_flow.dart';
import 'package:client_leger/widgets/currency/balance_pill.dart';
import 'package:client_leger/widgets/profile/user_profile_summary.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class AppHeader extends StatelessWidget {
  final String title;
  final VoidCallback onBack;
  final bool showBack;
  final TextStyle? titleStyle;
  final VoidCallback? onTapRankings;
  final VoidCallback? onTapShop;
  final VoidCallback? onTapSettings;
  final VoidCallback? onTapLogout;
  final bool showRankings;
  final bool showShop;
  final bool showSettings;
  final bool showLogout;

  const AppHeader({
    super.key,
    required this.title,
    required this.onBack,
    this.showBack = true,
    this.titleStyle,
    this.onTapRankings,
    this.onTapShop,
    this.onTapSettings,
    this.onTapLogout,
    this.showRankings = true,
    this.showShop = true,
    this.showSettings = true,
    this.showLogout = true,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12.0, left: 12.0, right: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showBack)
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: onBack,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white30),
                      ),
                      child: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                  ),
                ),
              const SizedBox(width: 12),
              const UserProfileSummary(compact: true, nameMaxWidth: 160),
              const SizedBox(width: 36),
              const BalancePill(),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style:
                  titleStyle ??
                  const TextStyle(
                    fontFamily: FontFamily.PAPYRUS,
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          const SizedBox(width: 12),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showRankings)
                _iconPill(
                  icon: Icons.emoji_events,
                  tooltip: 'LEADERBOARDS_PAGE.TITLE'.tr(),
                  onTap: onTapRankings,
                ),
              if (showRankings) const SizedBox(width: 10),
              if (showShop)
                _iconPill(
                  icon: Icons.store_mall_directory,
                  tooltip: 'SHOP_PAGE.TITLE'.tr(),
                  onTap: onTapShop,
                ),
              if (showShop) const SizedBox(width: 10),
              if (showSettings)
                _iconPill(
                  icon: Icons.settings,
                  tooltip: 'SETTINGS_PAGE.TITLE'.tr(),
                  onTap: onTapSettings,
                ),
              if (showSettings) const SizedBox(width: 10),
              if (showLogout)
                _iconPill(
                  icon: Icons.logout,
                  tooltip: 'USER.LOG_OUT'.tr(),
                  onTap: onTapLogout ?? (() => performLogoutFlow(context)),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _iconPill({
    required IconData icon,
    required VoidCallback? onTap,
    String? tooltip,
  }) {
    const double iconSize = 36;
    final content = Container(
      padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white30),
      ),
      child: Icon(icon, color: Colors.white, size: iconSize),
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: tooltip != null
            ? Tooltip(message: tooltip, child: content)
            : content,
      ),
    );
  }
}
