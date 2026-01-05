import 'package:flutter/material.dart';
// Simplified: no manual SystemChannels keyboard hide needed for basic behavior.
import 'package:flutter/services.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/widgets/waiting/waiting_chat.dart';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:client_leger/models/user_profile.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:easy_localization/easy_localization.dart';

class MenuChatFullScreen extends StatefulWidget {
  const MenuChatFullScreen({super.key, this.autofocus = false, this.onClose});

  final bool autofocus;
  final VoidCallback? onClose;

  @override
  State<MenuChatFullScreen> createState() => _MenuChatFullScreenState();
}

class _MenuChatFullScreenState extends State<MenuChatFullScreen> {
  late final Future<UserProfile?> _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = AuthService().getCurrentUserProfile();
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: const Color.fromARGB(255, 222, 222, 222),
        automaticallyImplyLeading: false,
        title: Text(
          'CHAT.GENERAL'.tr(),
          style: TextStyle(
            color: Colors.black,
            fontFamily: FontFamily.PAPYRUS,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.black),
            onPressed: () {
              FocusScope.of(context).unfocus();
              if (widget.onClose != null) {
                widget.onClose!();
              } else if (context.mounted) {
                Navigator.of(context).pop();
              }
            },
          ),
        ],
        iconTheme: const IconThemeData(color: Colors.black),
        elevation: 0,
      ),
      body: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => FocusScope.of(context).unfocus(),
        child: ThemedBackground(
          child: FutureBuilder<UserProfile?>(
            future: _profileFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                );
              }
              final profile = snapshot.data;
              final username =
                  profile?.username ?? user?.email ?? 'Utilisateur';
              return WaitingChat(
                roomCode: 'global',
                username: username,
                autofocus: widget.autofocus,
                showHeader: false,
                compact: true,
              );
            },
          ),
        ),
      ),
    );
  }
}
