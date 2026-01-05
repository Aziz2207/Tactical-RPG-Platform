import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:client_leger/services/chat/chat_service.dart';
import 'package:client_leger/models/chat_message.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ChatNotificationService with WidgetsBindingObserver {
  ChatNotificationService._();
  static final ChatNotificationService I = ChatNotificationService._();

  bool _initialized = false;
  StreamSubscription? _sub;
  StreamSubscription<User?>? _authSub;

  static final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();

  AppLifecycleState _appLifecycleState = AppLifecycleState.resumed;

  bool get _isActuallyVisible {
    final binding = WidgetsBinding.instance;

    final resumed = _appLifecycleState == AppLifecycleState.resumed;
    final hasRenderTree = binding.renderViewElement != null;
    final hasFocus = binding.focusManager.primaryFocus != null;

    return resumed && hasRenderTree && hasFocus;
  }

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    WidgetsBinding.instance.addObserver(this);

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidInit,
      iOS: iosInit,
    );

    await _local.initialize(initSettings);

    const channel = AndroidNotificationChannel(
      'chat_general_channel',
      'General Chat Messages',
      description: 'Notifications for general chat while app is backgrounded',
      importance: Importance.defaultImportance,
    );

    await _local
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);

    try {
      await ChatService.I.ensureListening();
    } catch (_) {}

    _bindChatStream();

    _authSub = FirebaseAuth.instance.authStateChanges().listen((user) async {
      if (user != null) {
        SocketService.I.disconnect();
        await Future.delayed(const Duration(milliseconds: 120));
        await ChatService.I.ensureListening();
        _bindChatStream();
      }
    });
  }

  void _bindChatStream() {
    _sub?.cancel();
    _sub = ChatService.I.stream.listen(_handleMessage);
  }

  void _handleMessage(dynamic data) {
    if (data is! ChatMessage) return;
    final msg = data;

    final isGlobal =
        msg.type.toLowerCase() == 'global' || msg.roomId == 'global';

    if (!isGlobal) return;

    if (_isActuallyVisible) {
      if (kDebugMode) {
        debugPrint('[ChatNotificationService] Skipping notif: app visible');
      }
      return;
    }

    _showLocalNotification(msg);
  }

  Future<void> _showLocalNotification(ChatMessage msg) async {
    final id = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    await _local.show(
      id,
      'Général • ${msg.username}',
      msg.message,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'chat_general_channel',
          'General Chat Messages',
          importance: Importance.high,
          priority: Priority.high,
          styleInformation: BigTextStyleInformation(''),
          icon: 'ic_stat_notify',
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: 'global_chat',
    );
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    await _authSub?.cancel();
    WidgetsBinding.instance.removeObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appLifecycleState = state;

    if (kDebugMode) {
      debugPrint('[ChatNotificationService] Lifecycle -> $state');
      debugPrint(
        '[ChatNotificationService] _isActuallyVisible = $_isActuallyVisible',
      );
    }

    if (_isActuallyVisible) {
      _local.cancelAll();
    }
  }
}
