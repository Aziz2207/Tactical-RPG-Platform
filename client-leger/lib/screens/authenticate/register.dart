import 'package:client_leger/screens/menu/menu.dart';
// import 'package:client_leger/services/authentification/auth.dart';
import 'package:client_leger/services/forms/text_form_validtor.dart';
import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/services/user-account/user-account.dart';
import 'package:client_leger/services/chat/chat_unread_service.dart';
import 'package:client_leger/utils/images/background_manager.dart';
import 'package:client_leger/utils/constants/assets/background-images.dart';
import 'package:client_leger/utils/constants/error/error_messages.dart';
import 'package:client_leger/widgets/forms/error-handler.dart';
import 'package:client_leger/widgets/forms/text-form-fields.dart';
import 'package:client_leger/utils/constants/assets/assets.dart';
import 'package:client_leger/utils/constants/decoration/box-decoration.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/widgets/forms/character-grid.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';

class Register extends StatefulWidget {
  Register({required this.toggleView});
  final Function toggleView;

  @override
  State<Register> createState() => _RegisterState();
}

class _RegisterState extends State<Register> {
  final List<String> characters = AppAssets.characters;
  final _formKey = GlobalKey<FormState>();
  final ErrorMessages _errors = ErrorMessages();
  late final UserAccountService _userAccountService;
  String email = '';
  String password = '';
  String pseudonym = '';
  String error = '';
  int selectedIndex = 0;
  int maxEmailLength = 100;
  int maxPLength = 20;
  final double inputWidth = 500;
  final double heightBetweenInputs = 30;
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _userAccountService = ServiceLocator.userAccount;
    ThemeConfig.setPaletteByName('gold');
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          decoration: BoxDecoration(
            image: DecorationImage(
              image: BackgroundImages.background,
              fit: BoxFit.cover,
            ),
          ),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0.0,
              centerTitle: true,
              title: Text(
                'Créer un compte',
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
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Column(
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
                                    hintText: 'Adresse courriel*',
                                    validator: (val) {
                                      if (val == null || val.isEmpty) {
                                        return 'Veuillez entrer une adresse courriel';
                                      }
                                      final RegExp emailRegex = RegExp(
                                        r'^[^@]+@[^@]+\.[^@]+',
                                      );
                                      if (!emailRegex.hasMatch(val)) {
                                        return 'Veuillez entrer une adresse valide';
                                      }
                                      return null;
                                    },
                                    nMaxCharacter: maxEmailLength,
                                    onChanged: (value) {
                                      setState(() {
                                        error = '';
                                        _errors.spaceEmailError = '';
                                        TextFormValidator.handleMaxLengthInput(
                                          value,
                                          (err) =>
                                              _errors.lengthEmailError = err,
                                          maxEmailLength,
                                        );
                                        email = value;
                                      });
                                    },
                                    onSpaceTyped: () {
                                      setState(() {
                                        _errors.spaceEmailError =
                                            "Espace détecté. Ce champ n'accepte pas les espaces.";
                                      });
                                    },
                                    focusNode: FocusNode(),
                                  ),
                                  if (_errors.spaceEmailError.isNotEmpty)
                                    ErrorHandler(
                                      error: _errors.spaceEmailError,
                                    ),
                                  if (_errors.lengthEmailError.isNotEmpty)
                                    ErrorHandler(
                                      error: _errors.lengthEmailError,
                                    ),
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
                                          (err) =>
                                              _errors.lengthPseudoError = err,
                                          maxPLength,
                                        );

                                        pseudonym = value;
                                      });

                                      if (value.isNotEmpty) {
                                        // TODO : TROUVER UNE SOLUTION POUR LE PSEUDONYME , VÉRIFIER DEJA COTÉ BACK-END
                                        // bool taken = await _auth.isPseudonymTaken(
                                        //   value,
                                        // );
                                        // setState(() {
                                        //   error = taken
                                        //       ? "Ce pseudonyme est déjà pris"
                                        //       : "";
                                        // });
                                      }
                                    },

                                    onSpaceTyped: () {
                                      setState(() {
                                        _errors.spacePseudoError =
                                            "Espace détecté. Ce champ n'accepte pas les espaces.";
                                      });
                                    },
                                    focusNode: FocusNode(),
                                  ),
                                  // if (error.isNotEmpty)
                                  //   Center(child: ErrorHandler(error: error)),
                                  if (_errors.spacePseudoError.isNotEmpty)
                                    ErrorHandler(
                                      error: _errors.spacePseudoError,
                                    ),
                                  if (_errors.lengthPseudoError.isNotEmpty)
                                    ErrorHandler(
                                      error: _errors.lengthPseudoError,
                                    ),
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
                                    validator: (val) =>
                                        TextFormValidator.validateInput(
                                          val,
                                          8,
                                          maxPLength,
                                          'mot de passe',
                                        ),

                                    nMaxCharacter: maxPLength,
                                    onChanged: (value) {
                                      setState(() {
                                        error = '';
                                        _errors.spacePasswordError = '';

                                        TextFormValidator.handleMaxLengthInput(
                                          value,
                                          (err) =>
                                              _errors.lengthPasswordError = err,
                                          maxPLength,
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

                                    focusNode: FocusNode(),
                                    obscureText: _obscurePassword,

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
                                    ErrorHandler(
                                      error: _errors.spacePasswordError,
                                    ),
                                  if (_errors.lengthPasswordError.isNotEmpty)
                                    ErrorHandler(
                                      error: _errors.lengthPasswordError,
                                    ),
                                ],
                              ),
                            ),
                            SizedBox(height: heightBetweenInputs),
                            Container(
                              child: ElevatedButton(
                                onPressed: _isLoading
                                    ? null
                                    : () async {
                                        setState(() {
                                          _errors.clearSpaceErrors();
                                          _errors.clearLengthErrors();
                                          _isLoading = true;
                                        });
                                        if (_formKey.currentState!.validate()) {
                                          try {
                                            await _userAccountService.signUp(
                                              email: email,
                                              password: password,
                                              username: pseudonym,
                                              avatarURL:
                                                  characters[selectedIndex],
                                            );
                                            if (!mounted) return;
                                            try {
                                              await ChatUnreadService.I.init();
                                            } catch (_) {}
                                            // Warm the menu background before navigating
                                            await AppMenuBackground.precache(
                                              context,
                                            );
                                            if (!mounted) return;
                                            Navigator.pushReplacement(
                                              context,
                                              MaterialPageRoute(
                                                builder: (context) =>
                                                    MenuPage(),
                                              ),
                                            );
                                          } catch (e) {
                                            setState(() {
                                              error = e.toString().replaceFirst(
                                                'Exception: ',
                                                '',
                                              );
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
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: EdgeInsets.symmetric(
                                        vertical: 10,
                                        horizontal: 40,
                                      ),
                                      decoration: kButtonDecoration,
                                      child: Text(
                                        "Créer le compte",
                                        style: TextStyle(
                                          color: Colors.black,
                                          fontSize: 20,
                                          fontFamily: FontFamily.PAPYRUS,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    SizedBox(height: heightBetweenInputs / 2),
                                    TextButton.icon(
                                      label: Text(
                                        'Déjà un compte ? Connexion',
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
                                      onPressed: () {
                                        widget.toggleView();
                                      },
                                    ),
                                    if (error.isNotEmpty) ...[
                                      Center(child: ErrorHandler(error: error)),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(width: 60),
                        Padding(padding: const EdgeInsets.only(left: 60)),
                        Column(
                          children: [
                            Text(
                              'Choisissez votre avatar',
                              style: TextStyle(
                                fontFamily: FontFamily.PAPYRUS,
                                fontSize: 25.0,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),

                            SizedBox(height: 20),

                            SizedBox(
                              width: 400,
                              height: 540,
                              child: CharacterGrid(
                                crossAxisCount: 3,
                                crossAxisSpacing: 10,
                                mainAxisSpacing: 10,
                                characters: characters,
                                selectedIndex: selectedIndex,
                                onSelect: (index) {
                                  setState(() {
                                    selectedIndex = index;
                                  });
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
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
