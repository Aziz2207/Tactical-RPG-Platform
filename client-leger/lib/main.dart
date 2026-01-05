import 'package:client_leger/screens/authenticate/authenticate.dart';
import 'package:client_leger/utils/images/background_manager.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:client_leger/services/chat/chat_unread_service.dart';
import 'package:client_leger/services/chat/chat_notification_service.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  final binding = WidgetsFlutterBinding.ensureInitialized();
  binding.deferFirstFrame();

  // Run independent tasks in parallel
  await Future.wait([
    Firebase.initializeApp(),
    dotenv.load(fileName: ".env"),
    EasyLocalization.ensureInitialized(),
  ]);

  // Lock to landscape
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  try {
    await ChatNotificationService.I.init();
  } catch (_) {}
  try {
    await ChatUnreadService.I.init();
  } catch (_) {}

  try {
    await ChatNotificationService.I.init();
  } catch (_) {}
  try {
    await ChatUnreadService.I.init();
  } catch (_) {}

  runApp(
    EasyLocalization(
      supportedLocales: const [
        Locale('en'),
        Locale('fr'),
        Locale('zh'),
        // Add more locales as needed
      ],
      path: 'assets/i18n',
      fallbackLocale: const Locale('fr'),
      child: _App(binding: binding),
    ),
  );
}

class _App extends StatefulWidget {
  const _App({required this.binding});
  final WidgetsBinding binding;

  @override
  State<_App> createState() => _AppState();
}

class _AppState extends State<_App> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Precache the shared background once at the target decode size
      await AppBackground.precache(context);
      widget.binding.allowFirstFrame();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      home: Authenticate(),
    );
  }
}