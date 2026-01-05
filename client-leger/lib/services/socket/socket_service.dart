import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'dart:async';

class SocketService {
  SocketService._();
  static final SocketService I = SocketService._();

  IO.Socket? _socket;

  Future<void> connect() async {
    if (_socket != null && _socket!.connected) return;

    final raw = dotenv.env['SERVER_URL'] ?? 'http://localhost:3000';
    final uri = Uri.parse(raw);
    final origin =
        '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
    final path = (uri.path.isEmpty || uri.path == '/')
        ? '/socket.io'
        : uri.path;

    String? token;
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        token = await user.getIdToken();
      }
    } catch (e) {
      if (kDebugMode) {
        print("[SocketService] Impossible de récupérer le token: $e");
      }
    }

    final opts = IO.OptionBuilder()
        .setTransports(['websocket', 'polling'])
        .setPath(path)
        .enableForceNew()
        .setAuth({'token': token})
        .build();

    _socket = IO.io(origin, opts);
    _socket!.connect();

    final c = Completer<void>();

    _socket!.on('connect', (_) {
      _log('Socket connected');
      if (!c.isCompleted) c.complete();
    });

    _socket!.on('connect_error', (err) {
      _log('connect_error: $err');
      if (!c.isCompleted) c.completeError(err);
    });

    return c.future;
  }

  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.close();
      _socket = null;
      _log("Socket déconnecté et remis à null");
    }
  }

  bool get isConnected => _socket?.connected ?? false;
  String? get id => _socket?.id;
  void emit(String event, [dynamic data]) => _socket?.emit(event, data);
  void on(String event, Function(dynamic) handler) =>
      _socket?.on(event, handler);
  void once(String event, Function(dynamic) handler) =>
      _socket?.once(event, handler);
  void off(String event) => _socket?.off(event);

  void offWithHandler(String event, Function(dynamic) handler) =>
      _socket?.off(event, handler);

  void _log(String msg) {
    if (kDebugMode) {
      print('[SocketService] $msg');
    }
  }
}
