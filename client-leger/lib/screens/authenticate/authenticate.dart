import 'package:client_leger/screens/authenticate/register.dart';
import 'package:client_leger/screens/authenticate/sign_in.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/utils/images/background_manager.dart';

class Authenticate extends StatefulWidget {
  @override
  State<Authenticate> createState() => _Authenticate();
}

class _Authenticate extends State<Authenticate> {
  bool showSignIn = true;

  // Shared background provider reused for both SignIn and Register
  ImageProvider? _bgProvider;

  void toggleView() {
    setState(() => showSignIn = !showSignIn);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final provider = AppBackground.getOrCreate(context);
    if (_bgProvider != provider) {
      _bgProvider = provider;
      precacheImage(_bgProvider!, context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Single shared background for both views
        if (_bgProvider != null)
          Image(
            image: _bgProvider!,
            fit: BoxFit.cover,
            filterQuality: FilterQuality.low,
          )
        else
          const ColoredBox(color: Colors.black),

        IndexedStack(
          index: showSignIn ? 0 : 1,
          children: [
            SignIn(toggleView: toggleView),
            Register(toggleView: toggleView),
          ],
        ),
      ],
    );
  }
}
