import 'package:flutter/material.dart';

import 'package:client_leger/widgets/buttons/build-action-button.dart';
import 'package:client_leger/widgets/menu/menu_overlay_panel.dart';
import 'package:client_leger/screens/chat/menu_chat_fullscreen.dart';
import 'package:client_leger/widgets/friends/friends-channel.dart';
import 'package:client_leger/services/chat/chat_unread_service.dart';

class ChatFriendsOverlay extends StatefulWidget {
  const ChatFriendsOverlay({super.key});

  @override
  State<ChatFriendsOverlay> createState() => _ChatFriendsOverlayState();
}

class _ChatFriendsOverlayState extends State<ChatFriendsOverlay> {
  bool _showChat = false;
  bool _showFriends = false;

  void _closeChat() => setState(() => _showChat = false);
  void _toggleFriends() => setState(() => _showFriends = !_showFriends);
  void _closeFriends() => setState(() => _showFriends = false);

  @override
  void initState() {
    super.initState();
    ChatUnreadService.I.init();
    ChatUnreadService.I.setReadingGlobal(false);
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final panelWidth = width * 0.35;

    return Stack(
      children: [
        ValueListenableBuilder<int>(
          valueListenable: ChatUnreadService.I.unreadGlobalCount,
          builder: (context, count, _) => BuildPositionButton(
            state: _showChat,
            onPressed: () {
              setState(() {
                _showChat = !_showChat;
                ChatUnreadService.I.setReadingGlobal(_showChat);
              });
            },
            defaultIcon: Icons.chat,
            right: 20,
            bottom: 50,
            showBadge: (count > 0) && !_showChat,
          ),
        ),
        BuildPositionButton(
          state: _showFriends,
          onPressed: _toggleFriends,
          defaultIcon: Icons.people_alt,
          right: 90,
          bottom: 50,
        ),

        // Overlays
        if (_showChat)
          MenuOverlayPanel(
            width: panelWidth,
            onClose: () {
              ChatUnreadService.I.setReadingGlobal(false);
              _closeChat();
            },
            child: MenuChatFullScreen(
              autofocus: false,
              onClose: () {
                ChatUnreadService.I.setReadingGlobal(false);
                _closeChat();
              },
            ),
          ),
        if (_showFriends)
          MenuOverlayPanel(
            width: panelWidth,
            onClose: _closeFriends,
            child: FriendsChannel(onClose: _closeFriends),
          ),
      ],
    );
  }
}
