import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_localization/easy_localization.dart';

class UserCard extends StatelessWidget {
  final String username;
  final String avatarUrl;
  final bool isConnected;
  final bool showConnectionStatus;
  final VoidCallback? onAddFriend;
  final VoidCallback? onRemoveFriend;
  final VoidCallback? onBlock;
  final VoidCallback? onUnblock;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;

  const UserCard({
    super.key,
    required this.username,
    required this.avatarUrl,
    this.isConnected = false,
    this.showConnectionStatus = true,
    this.onAddFriend,
    this.onRemoveFriend,
    this.onBlock,
    this.onUnblock,
    this.onAccept,
    this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        final String url = avatarUrl.trim();
        final bool isNetwork =
            url.startsWith('http://') || url.startsWith('https://');
        final ImageProvider imageProvider = isNetwork
            ? CachedNetworkImageProvider(url)
            : AssetImage(url);

        return Card(
          color: palette.secondaryVeryDark.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(25),
          ),
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundImage: imageProvider,
                      backgroundColor: Colors.black12,
                      onBackgroundImageError: (_, __) {},
                    ),
                    if (showConnectionStatus)
                      Positioned(
                        bottom: -1,
                        right: -1,
                        child: Container(
                          width: 17,
                          height: 17,
                          decoration: BoxDecoration(
                            color: isConnected ? Colors.green : Colors.red,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.black, width: 1),
                          ),
                        ),
                      ),
                  ],
                ),

                const SizedBox(width: 20),

                Expanded(
                  child: Text(
                    username,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.mainTextColor,
                      fontFamily: FontFamily.PAPYRUS,
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                    ),
                  ),
                ),
                if (this.onAddFriend != null)
                  IconButton(
                    icon: const Icon(
                      Icons.person_add_outlined,
                      color: Colors.white,
                      size: 30,
                    ),
                    onPressed: onAddFriend,
                  ),
                if (this.onRemoveFriend != null)
                  IconButton(
                    icon: const Icon(
                      Icons.person_remove_alt_1_outlined,
                      color: Colors.white,
                      size: 30,
                    ),
                    onPressed: onRemoveFriend,
                  ),
                if (this.onBlock != null)
                  IconButton(
                    icon: const Icon(
                      Icons.block,
                      color: Colors.white,
                      size: 30,
                    ),
                    onPressed: onBlock,
                  ),
                if (this.onUnblock != null)
                  IconButton(
                    tooltip: 'FRIENDS.UNBLOCK'.tr(),
                    icon: const Icon(
                      Icons.lock_open_rounded,
                      color: Colors.white,
                      size: 30,
                    ),
                    onPressed: onUnblock,
                  ),
                if (this.onAccept != null)
                  IconButton(
                    icon: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 30,
                    ),
                    onPressed: onAccept,
                  ),
                if (this.onReject != null)
                  IconButton(
                    icon: const Icon(
                      Icons.clear_sharp,
                      color: Colors.white,
                      size: 30,
                    ),
                    onPressed: onReject,
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
