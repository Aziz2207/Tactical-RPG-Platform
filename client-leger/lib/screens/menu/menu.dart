// Imports intentionally minimized; ServiceLocator not required here anymore.
import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/widgets/menu/team_credits_footer.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/utils/images/background_manager.dart';
import 'package:client_leger/widgets/buttons/menu-action-button.dart';
import 'package:client_leger/screens/create-game/create-game.dart';
import 'package:client_leger/screens/session-list/session-list.dart';
// ignore: unused_import
import 'package:client_leger/screens/join-session/join-session.dart';

import 'package:client_leger/services/authentification/logout_flow.dart';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/screens/shop/shop.dart';
import 'package:client_leger/screens/settings/settings.dart';
import 'package:client_leger/screens/rankings/rankings.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:client_leger/widgets/common/chat_friends_overlay.dart';
import 'package:client_leger/services/shop/shop_service.dart';

class MenuPage extends StatefulWidget {
  const MenuPage({super.key});

  @override
  State<MenuPage> createState() => _MenuPageState();
}

class _MenuPageState extends State<MenuPage> {
  final List<String> teamMembers = const [
    'Aziz Hidri',
    'Joey Hasrouny',
    'Éloic Côté',
    'Raissa Oumarou Petitot',
    'William Wang',
    'Gabriel Mejia',
  ];
  late final ShopService _shop;

  @override
  void dispose() {
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _shop = ServiceLocator.shop;
    _loadUserLanguage();
  }

  Future<void> _loadUserLanguage() async {
    try {
      final shopService =
          _shop; // Create instance or get from service locator if you have one
      final selectedLang = await shopService.getSelectedLanguage();

      if (mounted && selectedLang != null) {
        await context.setLocale(Locale(selectedLang));
      }
    } catch (e) {
      print('Error loading user language: $e');
      // Continue with fallback language if loading fails
    }
  }

  Future<void> _handleSignOut() async => performLogoutFlow(context);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset:
          false, // We want to prevent the keyboard from pushing the menu layout
      body: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => FocusScope.of(context).unfocus(),
        child: Stack(
          children: [
            Positioned.fill(
              child: ValueListenableBuilder<int>(
                valueListenable: AppMenuBackground.revision,
                builder: (context, _, __) {
                  return Image(
                    image: AppMenuBackground.getOrCreate(context),
                    fit: BoxFit.cover,
                  );
                },
              ),
            ),
            // Header and contents
            SafeArea(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const SizedBox(height: 8),
                  AppHeader(
                    title: '',
                    onBack: () {},
                    showBack: false,
                    onTapLogout: _handleSignOut,
                    onTapRankings: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const RankingsPage()),
                      );
                    },
                    onTapSettings: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SettingsPage()),
                      );
                    },
                    onTapShop: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ShopPage()),
                      );
                    },
                  ),
                  // Main content row: left (logo/buttons) + right (chat)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 6,
                            child: Container(
                              alignment: Alignment.topLeft,
                              margin: EdgeInsets.only(
                                left: MediaQuery.of(context).size.width * 0.12,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  const SizedBox(height: 55),
                                  Image.asset(
                                    'assets/images/logo/Age_Of_Mythology.png',
                                    width: 500,
                                    fit: BoxFit.contain,
                                  ),
                                  const SizedBox(height: 32),
                                  MenuActionButton(
                                    text: 'PAGE_HEADER.CREATE_GAME'.tr(),
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => CreateGame(),
                                        ),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 10),
                                  MenuActionButton(
                                    text: 'PAGE_HEADER.JOIN_GAME'.tr(),
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              const SessionListPage(),
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                        ],
                      ),
                    ),
                  ),
                  // Footer
                  TeamCreditsFooter(teamMembers: teamMembers),
                ],
              ),
            ),
            const ChatFriendsOverlay(),
          ],
        ),
      ),
    );
  }
}
