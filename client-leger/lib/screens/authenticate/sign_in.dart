// import 'dart:io';

import 'package:client_leger/screens/menu/menu.dart';
import 'package:client_leger/services/chat/chat_unread_service.dart';
import 'package:client_leger/services/forms/text_form_validtor.dart';
import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/services/user-account/user-account.dart';
import 'package:client_leger/utils/images/background_manager.dart';
import 'package:client_leger/utils/constants/error/error_messages.dart';
import 'package:client_leger/widgets/forms/error-handler.dart';
import 'package:client_leger/widgets/forms/text-form-fields.dart';
import 'package:client_leger/utils/constants/decoration/box-decoration.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
// import 'package:file_support/file_support.dart';
import 'package:flutter/material.dart';

class SignIn extends StatefulWidget {
  SignIn({required this.toggleView});
  final Function toggleView;
  @override
  State<SignIn> createState() => _SignInState();
}

class _SignInState extends State<SignIn> {
  final _formKey = GlobalKey<FormState>();
  final double inputWidth = 500;
  final double heightBetweenInputs = 40;
  final ErrorMessages _errors = ErrorMessages();
  late final UserAccountService _userAccountService;
  bool _isLoading = false;

  // String email = '';
  String username = '';
  int maxPLength = 20;
  String password = '';
  int maxEmailLength = 100;
  int maxPasswordLength = 20;
  bool _obscurePassword = true;
  String error = '';
  final FocusNode _emailFocusNode = FocusNode();
  final FocusNode _passwordFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _userAccountService = ServiceLocator.userAccount;
  }

  @override
  void dispose() {
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            iconTheme: IconThemeData(color: Colors.white),
            elevation: 0.0,
            centerTitle: true,
            title: Text(
              "Se connecter",
              style: TextStyle(
                fontFamily: FontFamily.PAPYRUS,
                fontWeight: FontWeight.bold,
                fontSize: 25.0,
                color: Colors.white,
              ),
            ),
          ),
          body: Container(
            padding: EdgeInsets.symmetric(vertical: 20.0, horizontal: 50.0),
            child: Center(
              child: SingleChildScrollView(
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      Image.asset(
                        "assets/images/logo/Age_Of_Mythology.png",
                        width: 500,
                        height: 150,
                        fit: BoxFit.cover,
                      ),
                      SizedBox(height: heightBetweenInputs),
                      SizedBox(
                        width: inputWidth,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CustomTextField(
                              autovalidateMode:
                                  AutovalidateMode.onUserInteraction,
                              hintText: 'Pseudonyme*',
                              nMaxCharacter: maxPLength,
                              validator: (val) =>
                                  TextFormValidator.validateInput(
                                    val,
                                    3,
                                    maxPLength,
                                    "pseudonyme",
                                  ),
                              onChanged: (value) async {
                                setState(() {
                                  error = '';
                                  _errors.spacePseudoError = '';

                                  TextFormValidator.handleMaxLengthInput(
                                    value,
                                    (err) => _errors.lengthPseudoError = err,
                                    maxPLength,
                                  );

                                  username = value;
                                });
                              },
                              onSpaceTyped: () {
                                setState(() {
                                  _errors.spacePseudoError =
                                      "Espace détecté. Ce champ n'accepte pas les espaces.";
                                });
                              },
                              focusNode: FocusNode(),
                            ),
                            if (_errors.spacePseudoError.isNotEmpty)
                              ErrorHandler(error: _errors.spacePseudoError),
                            if (_errors.lengthPseudoError.isNotEmpty)
                              ErrorHandler(error: _errors.lengthPseudoError),
                          ],
                        ),
                      ),
                      SizedBox(height: heightBetweenInputs),
                      SizedBox(
                        width: inputWidth,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CustomTextField(
                              autovalidateMode:
                                  AutovalidateMode.onUserInteraction,
                              hintText: 'Mot de passe*',
                              nMaxCharacter: maxPasswordLength,
                              validator: (val) =>
                                  TextFormValidator.validateInput(
                                    val,
                                    8,
                                    maxPasswordLength,
                                    'mot de passe',
                                  ),
                              onChanged: (value) {
                                setState(() {
                                  error = '';
                                  _errors.spacePasswordError = '';

                                  TextFormValidator.handleMaxLengthInput(
                                    value,
                                    (err) => _errors.lengthPasswordError = err,
                                    maxPasswordLength,
                                  );

                                  password = value;
                                });
                              },
                              onSpaceTyped: () {
                                setState(() {
                                  _errors.spacePasswordError =
                                      "Espace détecté. Ce champ n'accepte pas les espaces.";
                                });
                              },
                              obscureText: _obscurePassword,
                              focusNode: _passwordFocusNode,
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                  color: Colors.white,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscurePassword = !_obscurePassword;
                                  });
                                },
                              ),
                            ),
                            if (_errors.spacePasswordError.isNotEmpty)
                              ErrorHandler(error: _errors.spacePasswordError),
                            if (_errors.lengthPasswordError.isNotEmpty)
                              ErrorHandler(error: _errors.lengthPasswordError),
                          ],
                        ),
                      ),
                      SizedBox(height: heightBetweenInputs),
                      Container(
                        decoration: kButtonDecoration,
                        child: ElevatedButton(
                          onPressed: _isLoading
                              ? null
                              : () async {
                                  setState(() {
                                    _errors.clearSpaceErrors();
                                    _errors.clearLengthErrors();
                                    error = "";
                                    _isLoading = true;
                                  });
                                  if (_formKey.currentState!.validate()) {
                                    try {
                                      await _userAccountService.signIn(
                                        username,
                                        password,
                                      );
                                      if (!mounted) return;
                                      try {
                                        await ChatUnreadService.I.init();
                                      } catch (_) {}
                                      await AppMenuBackground.precache(context);
                                      if (!mounted) return;
                                      Navigator.pushReplacement(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => MenuPage(),
                                        ),
                                      );
                                    } catch (e) {
                                      setState(() {
                                        final msg = e.toString().replaceFirst(
                                          "Exception: ",
                                          "",
                                        );
                                        error = msg.contains("Compte")
                                            ? msg
                                            : "Pseudonyme ou mot de passe invalide";
                                        _isLoading = false;
                                      });
                                    }
                                  } else {
                                    setState(() {
                                      _isLoading = false;
                                    });
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            padding: EdgeInsets.symmetric(
                              vertical: 16,
                              horizontal: 24,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: Text(
                            "Se connecter",
                            style: TextStyle(
                              color: Colors.black,
                              fontFamily: FontFamily.PAPYRUS,
                              fontWeight: FontWeight.bold,
                              fontSize: 20,
                            ),
                          ),
                        ),
                      ),
                      SizedBox(height: heightBetweenInputs / 2),
                      TextButton(
                        onPressed: () {
                          widget.toggleView();
                        },
                        child: Text(
                          'Pas de compte ? S\'inscrire',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontFamily: FontFamily.PAPYRUS,
                            fontWeight: FontWeight.bold,
                            decoration: TextDecoration.underline,
                            decorationColor: Colors.white,
                            decorationThickness: 1.5,
                          ),
                        ),
                      ),
                      SizedBox(height: 12.0),
                      Text(
                        error,
                        style: TextStyle(color: Colors.red, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        Offstage(
          offstage: !_isLoading,
          child: IgnorePointer(
            ignoring: !_isLoading,
            child: Stack(
              children: [
                SizedBox.expand(
                  child: ColoredBox(color: Colors.black.withValues(alpha: 0.5)),
                ),
                const Center(
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: CircularProgressIndicator(
                      strokeWidth: 4,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
