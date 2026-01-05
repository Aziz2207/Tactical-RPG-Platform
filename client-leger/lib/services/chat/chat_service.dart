import 'dart:async';
import 'dart:convert';

import 'package:client_leger/models/chat_message.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart' as dotenv;
import 'package:http/http.dart' as http;

class ChatService {
  ChatService._();
  static final ChatService I = ChatService._();

  final _controller = StreamController<ChatMessage>.broadcast();
  Stream<ChatMessage> get stream => _controller.stream;

  Future<void> ensureListening() async {
    await SocketService.I.connect();

    SocketService.I.off('messageReceived');

    SocketService.I.on('messageReceived', (data) {
      try {
        if (data is Map) {
          final m = Map<String, dynamic>.from(data);

          final msg = ChatMessage(
            id: (m['_id'] ?? DateTime.now().microsecondsSinceEpoch).toString(),
            roomId: (m['roomId'] ?? m['roomCode'] ?? '').toString(),
            username: (m['username'] ?? 'Inconnu').toString(),
            message: (m['message'] ?? '').toString(),
            type: (m['type'] ?? 'global').toString(),
            timestamp: DateTime.parse(m['timestamp'] ?? "-"),
            avatarURL: m['avatarURL']?.toString(),
          );

          _controller.add(msg);
        } else {
          print("Donnée inattendue reçue: $data");
        }
      } catch (e) {
        print("Erreur parsing message: $e");
      }
    });
  }

  Future<List<ChatMessage>> fetchHistory(String roomCode) async {
    final raw = dotenv.dotenv.env['SERVER_URL'] ?? 'http://localhost:3000';
    final base = raw.endsWith('/') ? raw.substring(0, raw.length - 1) : raw;
    final isGlobal = roomCode.toLowerCase() == 'global';
    final qp = <String, String>{
      'type': isGlobal ? 'global' : 'room',
      if (!isGlobal) 'roomCode': roomCode,
    };
    final uri = Uri.parse('$base/api/chat').replace(queryParameters: qp);
    final res = await http.get(uri);
    if (res.statusCode != 200) throw Exception('HTTP ${res.statusCode}');
    final data = json.decode(res.body) as List;
    final list =
        data
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList()
          ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    return list;
  }

  void _send({required String message, required String type, String? roomId}) {
    final payload = {
      'message': message,
      'type': type,
      if (roomId != null && roomId.isNotEmpty) 'roomId': roomId,
      if (roomId != null && roomId.isNotEmpty) 'roomCode': roomId,
    };
    SocketService.I.emit('sendMessages', payload);
  }

  void sendGlobal({required String message}) =>
      _send(message: message, type: 'global');

  void sendToRoom({required String roomId, required String message}) =>
      _send(message: message, type: 'room', roomId: roomId);

  void dispose() {
    _controller.close();
    // Note: leaving socket listener registered for app lifetime
  }
}
