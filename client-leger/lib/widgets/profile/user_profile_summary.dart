import 'package:client_leger/models/user_profile.dart';
import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

/// Compact header widget showing the current user's avatar and username.
class UserProfileSummary extends StatelessWidget {
  final bool compact;
  final double nameMaxWidth;

  const UserProfileSummary({
    super.key,
    this.compact = false,
    this.nameMaxWidth = 200,
  });

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return const SizedBox.shrink();

    return StreamBuilder<UserProfile?>(
      stream: ServiceLocator.auth.currentUserProfileStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(
            height: 160,
            width: 160,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.white,
            ),
          );
        }

        final profile = snapshot.data;
        final avatarPath = (profile?.avatarURL ?? '').trim();

        return Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            if (!compact) const SizedBox(width: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(80),
              child: avatarPath.isNotEmpty
                  ? _AvatarImage(pathOrUrl: avatarPath, size: 60)
                  : Container(
                      width: 40,
                      height: 40,
                      color: Colors.white24,
                      child: const Icon(Icons.person, color: Colors.white),
                    ),
            ),
            SizedBox(width: compact ? 8 : 16),
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: nameMaxWidth),
              child: Text(
                profile?.username ?? user.email ?? 'Utilisateur',
                maxLines: 1,
                textAlign: TextAlign.start,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontFamily: FontFamily.PAPYRUS,
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _AvatarImage extends StatelessWidget {
  final String pathOrUrl;
  final double size;
  const _AvatarImage({required this.pathOrUrl, this.size = 60});

  @override
  Widget build(BuildContext context) {
    final p = pathOrUrl.trim();
    final isNetwork = p.startsWith('http://') || p.startsWith('https://');
    if (isNetwork) {
      return Image.network(
        p,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          width: size,
          height: size,
          color: Colors.white24,
          child: const Icon(Icons.person, color: Colors.white),
        ),
      );
    }
    return Image.asset(
      p,
      width: size,
      height: size,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        width: size,
        height: size,
        color: Colors.white24,
        child: const Icon(Icons.person, color: Colors.white),
      ),
    );
  }
}
