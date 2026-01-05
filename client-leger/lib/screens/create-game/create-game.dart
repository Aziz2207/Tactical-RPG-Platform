import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'game_item.dart';
import 'game_card.dart';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/screens/settings/settings.dart';
import 'package:client_leger/screens/shop/shop.dart';
import 'package:client_leger/screens/rankings/rankings.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/widgets/common/chat_friends_overlay.dart';
import 'package:easy_localization/easy_localization.dart';

class CreateGame extends StatefulWidget {
  @override
  State<CreateGame> createState() => _CreateGameState();
}

class _CreateGameState extends State<CreateGame> {
  final String fontFamily = 'Papyrus';

  String get baseUrl => dotenv.env['SERVER_URL'] ?? 'http://localhost:3000/';
  String _normalizeBase(String url) => url.endsWith('/') ? url : '$url/';

  bool _loading = true;
  String? _error;
  List<GameItem> _games = [];

  @override
  void initState() {
    super.initState();
    _fetchGames();
  }

  Future<void> _fetchGames() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final base = _normalizeBase(baseUrl);
      final uri = Uri.parse('${base}api/maps/visible');
      final token = await ServiceLocator.auth.getToken(forceRefresh: false);
      final res = await http.get(
        uri,
        headers: {if (token != null) 'Authorization': 'Bearer $token'},
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
        final games = data
            .map((e) => GameItem.fromJson(e as Map<String, dynamic>))
            .toList();
        setState(() {
          _games = games;
          _loading = false;
        });
      } else {
        throw Exception('HTTP ${res.statusCode}');
      }
    } catch (e) {
      setState(() {
        _error = 'ERROR.LOADING_GAMES'.tr();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          ThemedBackground(
            child: SafeArea(
              child: Column(
                children: [
                  AppHeader(
                    title: 'PAGE_HEADER.CREATE_GAME'.tr(),
                    onBack: () => Navigator.of(context).maybePop(),
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
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16.0),
                    child: Divider(color: Colors.white70),
                  ),
                  Expanded(child: _buildBody()),
                ],
              ),
            ),
          ),
          const ChatFriendsOverlay(),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _error!,
              style: TextStyle(
                color: Colors.white,
                fontFamily: fontFamily,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _fetchGames,
              child: Text(
                'ERROR.RETRY'.tr(),
                style: TextStyle(fontFamily: fontFamily),
              ),
            ),
          ],
        ),
      );
    }
    if (_games.isEmpty) {
      return Center(
        child: Text(
          'ERROR.NO_GAMES_AVAILABLE'.tr(),
          style: TextStyle(
            color: Colors.white,
            fontFamily: fontFamily,
            fontSize: 18,
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: GridView.builder(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisExtent: GameCard.cardSize,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: _games.length,
        itemBuilder: (context, index) {
          final game = _games[index];
          return GameCard(game: game, fontFamily: fontFamily);
        },
      ),
    );
  }
}
