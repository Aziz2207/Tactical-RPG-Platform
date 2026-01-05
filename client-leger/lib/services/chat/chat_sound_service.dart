import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/widgets.dart';

class ChatSoundService {
  ChatSoundService._();
  static final ChatSoundService I = ChatSoundService._();

  final _player = AudioPlayer();

  String incomingAssetRelativePath = 'sounds/output_mono4.wav';

  // Simple cooldown to avoid spamming sound on burst messages.
  Duration cooldown = const Duration(milliseconds: 600);
  DateTime _lastPlayed = DateTime.fromMillisecondsSinceEpoch(0);

  Future<void> playIncoming() async {
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    if (lifecycle != null && lifecycle != AppLifecycleState.resumed) {
      return;
    }
    final now = DateTime.now();
    if (now.difference(_lastPlayed) < cooldown) return;
    _lastPlayed = now;
    try {
      _player.setVolume(0.5);
      await _player.play(AssetSource(incomingAssetRelativePath));
    } catch (e) {}
  }

  void setIncomingAssetPath(String relativePath) {
    incomingAssetRelativePath = relativePath;
  }
}
