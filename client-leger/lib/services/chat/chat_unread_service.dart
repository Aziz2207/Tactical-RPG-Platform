import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:client_leger/services/chat/chat_service.dart';
import 'package:client_leger/services/chat/chat_sound_service.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ChatUnreadService {
  ChatUnreadService._();
  static final ChatUnreadService I = ChatUnreadService._();

  final ValueNotifier<int> unreadGlobalCount = ValueNotifier<int>(0);

  bool _initialized = false;
  bool _readingGlobal = false;
  StreamSubscription<User?>? _authSub;

  bool get isReadingGlobal => _readingGlobal;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    try {
      await ChatService.I.ensureListening();
    } catch (_) {}
    ChatService.I.stream.listen((msg) {
      final isGlobal =
          msg.type.toLowerCase() == 'global' || msg.roomId == 'global';
      if (isGlobal && !_readingGlobal) {
        unreadGlobalCount.value = unreadGlobalCount.value + 1;
        ChatSoundService.I.playIncoming();
      }
    });

    _authSub = FirebaseAuth.instance.authStateChanges().listen((user) async {
      if (user != null) {
        await Future.delayed(const Duration(milliseconds: 120));
        try {
          await ChatService.I.ensureListening();
        } catch (_) {}
      }
    });
  }

  void dispose() {
    _authSub?.cancel();
    _authSub = null;
  }

  void setReadingGlobal(bool reading) {
    _readingGlobal = reading;
    if (reading) {
      clearGlobal();
    }
  }

  void clearGlobal() {
    if (unreadGlobalCount.value != 0) {
      unreadGlobalCount.value = 0;
    }
  }
}
