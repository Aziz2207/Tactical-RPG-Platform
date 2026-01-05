import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/services/shop/shop_service.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/constants/assets/assets.dart';
import 'package:client_leger/utils/images/background_manager.dart';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/screens/shop/shop.dart';
import 'package:client_leger/screens/rankings/rankings.dart';
import 'package:client_leger/services/authentification/logout_flow.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:client_leger/screens/authenticate/authenticate.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:client_leger/widgets/common/chat_friends_overlay.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late final ShopService _shop;

  @override
  void initState() {
    super.initState();
    _shop = ServiceLocator.shop;
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppHeader(
                    key: ValueKey(context.locale),
                    title: 'SETTINGS_PAGE.TITLE'.tr(),
                    showSettings: false,
                    onBack: () => Navigator.of(context).maybePop(),
                    onTapRankings: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const RankingsPage()),
                      );
                    },
                    onTapShop: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const ShopPage()),
                      );
                    },
                    onTapLogout: () => performLogoutFlow(context),
                  ),
                  const Divider(color: Colors.white, height: 16, thickness: 1),
                  const SizedBox(height: 8),
                  Expanded(
                    child: DefaultTabController(
                      length: 3,
                      child: Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: ValueListenableBuilder<ThemePalette>(
                                valueListenable: ThemeConfig.palette,
                                builder: (context, palette, _) {
                                  return TabBar(
                                    key: ValueKey(context.locale),
                                    isScrollable: true,
                                    indicatorColor: palette.primary,
                                    labelColor: palette.primary,
                                    unselectedLabelColor: palette.mainTextColor
                                        .withOpacity(0.7),
                                    labelStyle: const TextStyle(
                                      fontFamily: FontFamily.PAPYRUS,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 20,
                                    ),
                                    tabs: [
                                      Tab(
                                        text: 'SETTINGS_PAGE.TABS.VISUAL'.tr(),
                                      ),
                                      Tab(
                                        text: 'SETTINGS_PAGE.TABS.ACCOUNT'.tr(),
                                      ),
                                      Tab(
                                        text: 'SETTINGS_PAGE.TABS.STATS'.tr(),
                                      ),
                                    ],
                                  );
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Expanded(
                            child: TabBarView(
                              children: [
                                _VisualAndLanguageTab(shop: _shop),
                                _AccountEditTab(shop: _shop),
                                const _StatisticsTab(),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const ChatFriendsOverlay(),
        ],
      ),
    );
  }
}

class _UserStats {
  final String uid;
  final int numOfClassicPartiesPlayed;
  final int numOfCTFPartiesPlayed;
  final int numOfPartiesWon;
  final List<double> gameDurationsForPlayer;

  const _UserStats({
    required this.uid,
    required this.numOfClassicPartiesPlayed,
    required this.numOfCTFPartiesPlayed,
    required this.numOfPartiesWon,
    required this.gameDurationsForPlayer,
  });

  factory _UserStats.fromJson(Map<String, dynamic> j) => _UserStats(
    uid: (j['uid'] ?? '').toString(),
    numOfClassicPartiesPlayed: ((j['numOfClassicPartiesPlayed'] as num?) ?? 0)
        .toInt(),
    numOfCTFPartiesPlayed: ((j['numOfCTFPartiesPlayed'] as num?) ?? 0).toInt(),
    numOfPartiesWon: ((j['numOfPartiesWon'] as num?) ?? 0).toInt(),
    gameDurationsForPlayer: ((j['gameDurationsForPlayer'] as List?) ?? const [])
        .map<double>((e) {
          if (e is num) return e.toDouble();
          if (e is String) return double.tryParse(e) ?? 0.0;
          return 0.0;
        })
        .toList(),
  );

  Duration get averageDuration {
    if (gameDurationsForPlayer.isEmpty) return Duration.zero;
    final total = gameDurationsForPlayer.fold<double>(0, (a, b) => a + b);
    final avgSeconds = total / gameDurationsForPlayer.length;
    return Duration(seconds: avgSeconds.round());
  }
}

class _StatisticsTab extends StatefulWidget {
  const _StatisticsTab();

  @override
  State<_StatisticsTab> createState() => _StatisticsTabState();
}

class _StatisticsTabState extends State<_StatisticsTab> {
  _UserStats? _stats;
  bool _loading = true;
  String? _error;
  void Function(dynamic)? _onStats;
  void Function(dynamic)? _onError;
  void Function(dynamic)? _onConnect;
  bool _didRetry = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      final auth = FirebaseAuth.instance;
      if (auth.currentUser == null) {
        try {
          await auth
              .authStateChanges()
              .firstWhere((u) => u != null)
              .timeout(const Duration(seconds: 5));
        } catch (_) {
          if (!mounted) return;
          setState(() {
            _loading = false;
            _error = 'Authentification requise pour charger les statistiques';
          });
          return;
        }
      }

      await SocketService.I.connect();

      _onStats = (data) {
        try {
          if (!mounted) return;
          final map = (data is Map)
              ? Map<String, dynamic>.from(data)
              : <String, dynamic>{};
          final parsed = _UserStats.fromJson(map);
          setState(() {
            _stats = parsed;
            _loading = false;
            _error = null;
          });
        } catch (e) {
          if (!mounted) return;
          setState(() {
            _loading = false;
            _error = 'Erreur de lecture des statistiques';
          });
        }
      };
      SocketService.I.on('userStatistics', _onStats!);

      _onError = (data) {
        if (_didRetry || !mounted) return;
        final msg = data?.toString().toLowerCase() ?? '';
        if (msg.contains('authentification') || msg.contains('utilisateur')) {
          _didRetry = true;
          Future.delayed(const Duration(milliseconds: 500), () {
            SocketService.I.emit('getUserStatistics');
          });
        }
      };
      SocketService.I.on('errorMessage', _onError!);

      _onConnect = (_) {
        if (!_didRetry && mounted && _loading) {
          _didRetry = true;
          SocketService.I.emit('getUserStatistics');
        }
      };
      SocketService.I.on('connect', _onConnect!);

      Future.delayed(const Duration(milliseconds: 50), () {
        if (mounted && _loading && !_didRetry) {
          _didRetry = true;
          SocketService.I.emit('getUserStatistics');
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Erreur de connexion au serveur: $e';
      });
    }
  }

  @override
  void dispose() {
    if (_onStats != null) {
      SocketService.I.offWithHandler('userStatistics', _onStats!);
    }
    if (_onError != null) {
      SocketService.I.offWithHandler('errorMessage', _onError!);
    }
    if (_onConnect != null) {
      SocketService.I.offWithHandler('connect', _onConnect!);
    }
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    final s = d.inSeconds.remainder(60);
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(h)}:${two(m)}:${two(s)}';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white70),
      );
    }
    if (_error != null) {
      return Center(
        child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
      );
    }
    final stats = _stats;
    if (stats == null) {
      return const Center(
        child: Text(
          'Aucune statistique disponible',
          style: TextStyle(color: Colors.white70),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: ValueListenableBuilder<ThemePalette>(
        valueListenable: ThemeConfig.palette,
        builder: (context, palette, _) {
          final labelStyle = TextStyle(
            color: palette.mainTextColor,
            fontFamily: FontFamily.PAPYRUS,
            fontWeight: FontWeight.bold,
            fontSize: 30,
          );
          final valueStyle = TextStyle(
            color: palette.primary,
            fontFamily: FontFamily.PAPYRUS,
            fontWeight: FontWeight.w900,
            fontSize: 48,
          );
          final boxDecoration = BoxDecoration(
            color: palette.secondaryVeryDark.withOpacity(0.55),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white24),
          );

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionTitle('SETTINGS_PAGE.TABS.STATS'.tr()),
              const SizedBox(height: 12),
              GridView(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 3.8,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: boxDecoration,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              'SETTINGS_PAGE.SECTIONS.STATS.GAMES_CLASSIC'.tr(),
                              style: labelStyle,
                            ),
                            const SizedBox(width: 6),
                            Text('⚔️', style: labelStyle),
                          ],
                        ),
                        Text(
                          '${stats.numOfClassicPartiesPlayed}',
                          style: valueStyle,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: boxDecoration,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              'SETTINGS_PAGE.SECTIONS.STATS.GAMES_CTF'.tr(),
                              style: labelStyle,
                            ),
                            const SizedBox(width: 6),
                            Text('🚩', style: labelStyle),
                          ],
                        ),
                        Text(
                          '${stats.numOfCTFPartiesPlayed}',
                          style: valueStyle,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: boxDecoration,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              'SETTINGS_PAGE.SECTIONS.STATS.GAMES_WON'.tr(),
                              style: labelStyle,
                            ),
                            const SizedBox(width: 6),
                            Text('🏆', style: labelStyle),
                          ],
                        ),
                        Text('${stats.numOfPartiesWon}', style: valueStyle),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: boxDecoration,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              'SETTINGS_PAGE.SECTIONS.STATS.AVG_GAME_TIME'.tr(),
                              style: labelStyle,
                            ),
                            const SizedBox(width: 6),
                            Text('⏳', style: labelStyle),
                          ],
                        ),
                        Text(
                          _formatDuration(stats.averageDuration),
                          style: valueStyle,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
          );
        },
      ),
    );
  }
}

class _VisualAndLanguageTab extends StatefulWidget {
  final ShopService shop;
  const _VisualAndLanguageTab({required this.shop});

  @override
  State<_VisualAndLanguageTab> createState() => _VisualAndLanguageTabState();
}

class _VisualAndLanguageTabState extends State<_VisualAndLanguageTab> {
  static const MethodChannel _iconChannel = MethodChannel('dynamic_icon');
  String _selectedIcon = 'default';
  bool _iconLoading = false;
  String _language = 'fr';
  String? _tempSelectedBackgroundFile;
  Future<_ThemesData>? _themesFuture;
  String? _selectedThemeLocal;
  bool _isLoadingLanguage = false;

  @override
  void initState() {
    super.initState();
    _tempSelectedBackgroundFile = AppMenuBackground.currentFilename;
    _themesFuture = _fetchOwnedThemesAndSelected();
    _loadSelectedLanguage();
    _loadCurrentIcon();
  }

  Future<void> _loadSelectedLanguage() async {
    try {
      final selectedLang = await widget.shop.getSelectedLanguage();
      if (mounted) {
        setState(() {
          _language = selectedLang ?? 'fr';
        });
        await context.setLocale(Locale(_language));
      }
    } catch (e) {
      print('Error loading selected language: $e');
    }
  }

  Future<void> _loadCurrentIcon() async {
    try {
      final icon = await _iconChannel.invokeMethod<String>('getCurrentIcon');
      if (mounted && icon != null) {
        setState(() {
          _selectedIcon = icon;
        });
      }
    } catch (_) {}
  }

  Future<void> _changeAppIcon(String iconName) async {
    if (_iconLoading) return;

    setState(() => _iconLoading = true);

    try {
      await _iconChannel.invokeMethod('changeIcon', {'iconName': iconName});
      if (mounted) {
        setState(() => _selectedIcon = iconName);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to change icon: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _iconLoading = false);
      }
    }
  }

  Future<void> _changeLanguage(String newLanguage) async {
    setState(() => _isLoadingLanguage = true);

    try {
      await widget.shop.setSelectedLanguage(newLanguage);

      setState(() {
        _language = newLanguage;
        _isLoadingLanguage = false;
      });

      if (mounted) {
        await context.setLocale(Locale(newLanguage));
      }

      if (!mounted) return;
    } catch (e) {
      setState(() => _isLoadingLanguage = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _assetForBackgroundUrl(String url) {
    try {
      final uri = Uri.parse(url);
      String filename = uri.pathSegments.isNotEmpty
          ? uri.pathSegments.last
          : url.split('/').last;
      filename = filename.trim();
      return 'assets/images/backgrounds/$filename';
    } catch (_) {
      final fallback = url.split('/').last.trim();
      return 'assets/images/backgrounds/$fallback';
    }
  }

  String _filenameFromAny(String pathOrUrl) {
    return pathOrUrl.split('/').last.trim();
  }

  Future<_ThemesData> _fetchOwnedThemesAndSelected() async {
    try {
      final owned = await widget.shop.getOwnedThemes();
      final selected = await widget.shop.getSelectedTheme();
      return _ThemesData(owned: owned, selected: selected);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> _applyTheme(String themeName) async {
    final known = ThemeConfig.availableThemeNames;
    final idx = known.indexWhere(
      (k) => k.toLowerCase() == themeName.toLowerCase(),
    );
    final canonical = idx >= 0 ? known[idx] : themeName;

    try {
      await widget.shop.selectTheme(canonical);
      ThemeConfig.setPaletteByName(canonical);
      setState(() {
        _selectedThemeLocal = canonical;
      });
      if (!mounted) return;
    } catch (e) {
      if (!mounted) return;
    }
  }

  String translateKey(dynamic value) {
    if (value == null) return "";
    final key = value.toString();
    return key.tr();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: ListView(
        children: [
          _SectionTitle('SETTINGS_PAGE.SECTIONS.LANGUAGE.TITLE'.tr()),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.language, color: Colors.white70),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: _language,
                dropdownColor: const Color(0xFF2A2A2A),
                style: const TextStyle(color: Colors.white),
                items: const [
                  DropdownMenuItem(value: 'fr', child: Text('Français')),
                  DropdownMenuItem(value: 'en', child: Text('English')),
                ],
                onChanged: (v) {
                  if (v != null && v != _language) {
                    _changeLanguage(v);
                  }
                },
              ),
              const SizedBox(width: 16),
            ],
          ),
          const SizedBox(height: 24),

          _SectionTitle("SETTINGS_PAGE.SECTIONS.BACKGROUND.TITLE".tr()),
          const SizedBox(height: 8),
          FutureBuilder(
            future: _loadOwnedBackgroundItems(),
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Text(
                  'Erreur: ${snapshot.error}',
                  style: const TextStyle(color: Colors.redAccent),
                );
              }
              final items = snapshot.data!;
              if (items.isEmpty) {
                return Text(
                  "SETTINGS_PAGE.SECTIONS.BACKGROUND.NO_BACKGROUNDS".tr(),
                  style: TextStyle(color: Colors.white70),
                );
              }
              return LayoutBuilder(
                builder: (context, constraints) {
                  const desiredTileWidth = 260.0;
                  int columns = (constraints.maxWidth / desiredTileWidth)
                      .floor();
                  if (columns < 1) columns = 1;
                  if (columns > 4) columns = 4;
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.3,
                    ),
                    itemCount: items.length,
                    itemBuilder: (context, i) {
                      final b = items[i];
                      final assetPath = _assetForBackgroundUrl(b.imageUrl);
                      final filename = _filenameFromAny(assetPath);
                      final isSelected =
                          _tempSelectedBackgroundFile == filename;
                      return ValueListenableBuilder<ThemePalette>(
                        valueListenable: ThemeConfig.palette,
                        builder: (context, palette, _) {
                          return GestureDetector(
                            onTap: () => _applyBackground(filename),
                            child: Container(
                              decoration: BoxDecoration(
                                color: palette.secondaryVeryDark.withOpacity(
                                  0.5,
                                ),
                                border: Border.all(
                                  color: isSelected
                                      ? palette.primary
                                      : palette.mainTextColor.withOpacity(0.24),
                                  width: isSelected ? 2.0 : 1.0,
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              padding: const EdgeInsets.all(8),
                              child: Column(
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.asset(
                                        assetPath,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  const SizedBox(height: 4),
                                ],
                              ),
                            ),
                          );
                        },
                      );
                    },
                  );
                },
              );
            },
          ),

          const SizedBox(height: 24),
          _SectionTitle('SETTINGS_PAGE.SECTIONS.THEME.TITLE'.tr()),
          const SizedBox(height: 8),
          const SizedBox(height: 12),
          FutureBuilder<_ThemesData>(
            future: _themesFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Text(
                  'SETTINGS_PAGE.DIALOG.LOAD_THEMES_FAILED'.tr(),
                  style: const TextStyle(color: Colors.redAccent),
                );
              }
              final data =
                  snapshot.data ?? const _ThemesData(owned: [], selected: null);
              final owned = data.owned.toList();

              if (owned.isEmpty) {
                return Text(
                  "SETTINGS_PAGE.SECTIONS.THEME.NO_THEME".tr(),
                  style: TextStyle(color: Colors.white70),
                );
              }

              final selectedCanonical = _selectedThemeLocal ?? data.selected;

              return LayoutBuilder(
                builder: (context, constraints) {
                  int columns = 6;
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.9,
                    ),
                    itemCount: owned.length,
                    itemBuilder: (context, i) {
                      final themeName = owned[i];
                      final isSelected =
                          (selectedCanonical != null &&
                          themeName.toLowerCase() ==
                              selectedCanonical.toLowerCase());

                      // Translate the theme name using the THEME.THEMENAME key
                      final label = ("THEME." + themeName.toUpperCase())
                          .replaceAll('-', '_')
                          .tr();

                      return ValueListenableBuilder<ThemePalette>(
                        valueListenable: ThemeConfig.palette,
                        builder: (context, palette, _) {
                          List<Color> previewColors;
                          // FIX: Pass the full theme key to previewPaletteForName
                          final pal = ThemeConfig.previewPaletteForName(
                            themeName, // This already contains 'THEME.XXX' format
                          );
                          if (pal != null) {
                            previewColors = [
                              pal.primary,
                              pal.secondary,
                              pal.secondaryDark,
                            ];
                          } else {
                            previewColors = const [
                              Color(0xFFE0E0E0),
                              Color(0xFF9E9E9E),
                              Color(0xFF424242),
                            ];
                          }
                          return InkWell(
                            onTap: () => _applyTheme(themeName),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Expanded(
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: palette.secondaryVeryDark
                                          .withOpacity(0.55),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isSelected
                                            ? palette.primary
                                            : palette.mainTextColor.withOpacity(
                                                0.25,
                                              ),
                                        width: isSelected ? 3 : 1,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: palette.primaryBoxShadow,
                                          offset: const Offset(0, 2),
                                          blurRadius: 6,
                                        ),
                                      ],
                                    ),
                                    padding: const EdgeInsets.all(6),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.stretch,
                                        children: [
                                          Expanded(
                                            child: Container(
                                              color: previewColors[0],
                                            ),
                                          ),
                                          Expanded(
                                            child: Container(
                                              color: previewColors[1],
                                            ),
                                          ),
                                          Expanded(
                                            child: Container(
                                              color: previewColors[2],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Center(
                                  child: Text(
                                    label,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: palette.mainTextColor,
                                      fontFamily: FontFamily.PAPYRUS,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
                  );
                },
              );
            },
          ),
          const SizedBox(height: 60),
          // -------------------------
          // App Icon Section (3 icons)
          // -------------------------
          const SizedBox(height: 24),
          _SectionTitle("SETTINGS_PAGE.SECTIONS.APP_ICON.TITLE".tr()),
          const SizedBox(height: 12),

          ValueListenableBuilder<ThemePalette>(
            valueListenable: ThemeConfig.palette,
            builder: (context, palette, _) {
              final isDefault = _selectedIcon == 'default';
              final isAlt = _selectedIcon == 'alt';
              final isAlt2 = _selectedIcon == 'alt2';

              Widget buildIconTile({
                required String label,
                required String iconName,
                required String assetPath,
                required bool selected,
              }) {
                return SizedBox(
                  width: 240, // fixed width → prevents stretching
                  child: InkWell(
                    onTap: _iconLoading ? null : () => _changeAppIcon(iconName),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: selected ? palette.primary : Colors.white24,
                          width: 2,
                        ),
                        color: palette.secondaryVeryDark.withOpacity(0.55),
                      ),
                      child: Column(
                        children: [
                          SizedBox(
                            height: 72,
                            width: 72,
                            child: Image.asset(assetPath, fit: BoxFit.contain),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            label,
                            style: TextStyle(
                              color: selected
                                  ? palette.primary
                                  : palette.mainTextColor,
                              fontFamily: FontFamily.PAPYRUS,
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return Wrap(
                alignment: WrapAlignment.start, // aligns nicely under the title
                spacing: 16, // horizontal spacing
                runSpacing: 16, // vertical spacing
                children: [
                  buildIconTile(
                    label: "SETTINGS_PAGE.SECTIONS.APP_ICON.DEFAULT".tr(),
                    iconName: "default",
                    assetPath: 'assets/app_icons/default.png',
                    selected: isDefault,
                  ),

                  buildIconTile(
                    label: "SETTINGS_PAGE.SECTIONS.APP_ICON.TRIDENT".tr(),
                    iconName: "alt",
                    assetPath: 'assets/app_icons/alt.png',
                    selected: isAlt,
                  ),

                  buildIconTile(
                    label: "SETTINGS_PAGE.SECTIONS.APP_ICON.LIGHTNING".tr(),
                    iconName: "alt2",
                    assetPath: 'assets/app_icons/alt2.png',
                    selected: isAlt2,
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: 16),

          if (_iconLoading)
            const Center(child: CircularProgressIndicator(strokeWidth: 2)),

          if (_iconLoading)
            const Center(child: CircularProgressIndicator(strokeWidth: 2)),
        ],
      ),
    );
  }

  Future<List<dynamic>> _loadOwnedBackgroundItems() async {
    final all = await widget.shop.getAvailableBackgrounds();
    final ownedFilenames = (await widget.shop.getOwnedBackgroundFilenames())
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toSet();

    if (ownedFilenames.isEmpty) return <dynamic>[];

    final filtered = all.where((b) {
      final assetPath = _assetForBackgroundUrl(b.imageUrl);
      final filename = _filenameFromAny(assetPath);
      return ownedFilenames.contains(filename);
    }).toList();

    return filtered;
  }

  Future<void> _applyBackground(String filename) async {
    AppMenuBackground.setByFilename(filename);
    setState(() => _tempSelectedBackgroundFile = filename);

    try {
      await widget.shop.selectBackgroundByFilename(filename);
      if (!mounted) return;
    } catch (e) {
      if (!mounted) return;
    }
  }
}

class _ThemesData {
  final List<String> owned;
  final String? selected;
  const _ThemesData({required this.owned, required this.selected});
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Colors.white,
        fontFamily: FontFamily.PAPYRUS,
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
    );
  }
}

class _AccountEditTab extends StatefulWidget {
  final ShopService shop;
  const _AccountEditTab({required this.shop});

  @override
  State<_AccountEditTab> createState() => _AccountEditTabState();
}

class _AccountEditTabState extends State<_AccountEditTab> {
  late final List<String> _defaultAvatars;
  List<String> _availableAvatars = [];
  String? _initialAvatar;
  String? _selectedAvatar;
  final TextEditingController _usernameCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final FocusNode _blankFocus = FocusNode(debugLabel: 'SettingsBlankFocus');
  String? _initialUsername;
  String? _initialEmail;
  String? _emailError;
  String? _usernameError;
  bool _loading = true;
  String? _error;
  bool _saving = false;
  bool _uploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    _defaultAvatars = List<String>.from(AppAssets.characters);
    _bootstrap();
  }

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _emailCtrl.dispose();
    _blankFocus.dispose();
    super.dispose();
  }

  bool _looksLikeNetworkImage(String value) {
    final v = value.trim();
    if (v.isEmpty) return false;
    final hasScheme = v.contains('://') || v.startsWith('data:');
    return hasScheme;
  }

  Widget _buildAvatarPreview({
    required String? src,
    required ThemePalette palette,
  }) {
    if (src == null || src.isEmpty) {
      return Icon(
        Icons.person,
        color: palette.mainTextColor.withValues(alpha: 0.6),
        size: 64,
      );
    }
    if (_looksLikeNetworkImage(src)) {
      return Image.network(
        src,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Icon(
          Icons.person_off,
          color: palette.mainTextColor.withValues(alpha: 0.6),
          size: 64,
        ),
      );
    }
    return Image.asset(
      src,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Icon(
        Icons.person_off,
        color: palette.mainTextColor.withValues(alpha: 0.6),
        size: 64,
      ),
    );
  }

  String _normalizeAsset(String s) {
    return s.startsWith('./') ? s.substring(2) : s;
  }

  Future<void> _bootstrap() async {
    try {
      final profile = await ServiceLocator.auth.getCurrentUserProfile();
      final currentAvatar = _normalizeAsset(profile?.avatarURL ?? '');
      final currentUsername = (profile?.username ?? '').trim();
      final currentEmail = (profile?.email ?? '').trim();

      final list = List<String>.from(_defaultAvatars);

      setState(() {
        _availableAvatars = list;
        _initialAvatar = currentAvatar.isNotEmpty
            ? currentAvatar
            : (list.isNotEmpty ? list.first : null);
        _selectedAvatar = _initialAvatar;
        _initialUsername = currentUsername;
        _initialEmail = currentEmail;
        _usernameCtrl.text = currentUsername;
        _emailCtrl.text = currentEmail;
        _loading = false;
        _error = null;
      });
      _validateEmail(_emailCtrl.text);
      _validateUsername(_usernameCtrl.text);
    } catch (e) {
      setState(() {
        _loading = false;
        _error = 'Erreur lors du chargement: $e';
      });
    }
  }

  Future<void> _captureAndUploadAvatar() async {
    if (_uploadingAvatar) return;
    setState(() => _uploadingAvatar = true);
    try {
      final picker = ImagePicker();
      final XFile? photo = await picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        imageQuality: 85,
        maxWidth: 1024,
      );

      if (photo == null) {
        return;
      }

      final bytes = await photo.readAsBytes();
      final uid = FirebaseAuth.instance.currentUser?.uid ?? 'anonymous';
      final ts = DateTime.now().millisecondsSinceEpoch;
      final path = 'images/avatars/$uid/$ts.jpg';

      final ref = FirebaseStorage.instance.ref().child(path);
      final uploadTask = ref.putData(
        bytes,
        SettableMetadata(contentType: 'image/jpeg'),
      );
      final snapshot = await uploadTask;
      final url = await snapshot.ref.getDownloadURL();

      if (!mounted) return;
      setState(() {
        _selectedAvatar = url;
      });

      if (!mounted) return;
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('AVATAR_SELECTOR.IMAGE_UPLOAD_ERROR_TITLE'.tr()),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  void _validateEmail(String value) {
    final v = value.trim();
    String? err;
    if (v.isEmpty) {
      err = "SETTINGS_PAGE.SECTIONS.ACCOUNT_INFO.EMAIL_REQUIRED".tr();
    } else if (v.length > 100) {
      err = "SETTINGS_PAGE.SECTIONS.ACCOUNT_INFO.EMAIL_TOO_LONG".tr();
    } else {
      final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
      if (!emailRegex.hasMatch(v)) {
        err = "SETTINGS_PAGE.SECTIONS.ACCOUNT_INFO.EMAIL_INVALID".tr();
      }
    }
    setState(() => _emailError = err);
  }

  void _validateUsername(String value) {
    final v = value.trim();
    String? err;
    if (v.isEmpty) {
      err = "SETTINGS_PAGE.SECTIONS.ACCOUNT_INFO.USERNAME_REQUIRED".tr();
    } else if (v.length < 3 || v.length > 20) {
      err = "SETTINGS_PAGE.SECTIONS.ACCOUNT_INFO.USERNAME_LENGTH".tr();
    }
    setState(() => _usernameError = err);
  }

  bool get _hasChanges {
    final avatarChanged =
        _selectedAvatar != null && _selectedAvatar != _initialAvatar;
    final usernameChanged =
        _usernameCtrl.text.trim() != (_initialUsername ?? '').trim();
    final emailChanged = _emailCtrl.text.trim() != (_initialEmail ?? '').trim();
    return avatarChanged || usernameChanged || emailChanged;
  }

  void _restoreOriginalState() {
    setState(() {
      _selectedAvatar = _initialAvatar;
      _usernameCtrl.text = _initialUsername ?? '';
      _emailCtrl.text = _initialEmail ?? '';
      _validateEmail(_emailCtrl.text);
      _validateUsername(_usernameCtrl.text);
    });
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus(disposition: UnfocusDisposition.scope);
    FocusScope.of(context).requestFocus(_blankFocus);

    if (!_hasChanges) return;
    setState(() => _saving = true);
    try {
      await ServiceLocator.userAccount.updateUserAccount(
        avatarURL: _selectedAvatar,
        username: _usernameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _initialAvatar = _selectedAvatar;
        _initialUsername = _usernameCtrl.text.trim();
        _initialEmail = _emailCtrl.text.trim();
      });
      await _showInfoDialog(
        title: 'SETTINGS_PAGE.DIALOG.ACCOUNT_UPDATED_TITLE'.tr(),
        message: 'SETTINGS_PAGE.DIALOG.ACCOUNT_UPDATED_MESSAGE'.tr(),
      );
      if (mounted) {
        FocusScope.of(context).requestFocus(_blankFocus);
      }
    } catch (e) {
      if (!mounted) return;
      await _showInfoDialog(
        title: 'SETTINGS_PAGE.DIALOG.ERROR_TITLE'.tr(),
        message: 'SETTINGS_PAGE.DIALOG.ERROR_UPDATE_ACCOUNT'.tr(),
      );
      if (mounted) {
        FocusScope.of(context).requestFocus(_blankFocus);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showInfoDialog({
    required String title,
    required String message,
  }) async {
    await AppDialogs.showInfo(context: context, title: title, message: message);
  }

  Future<void> _deleteAccount() async {
    final confirmed = await AppDialogs.showConfirm(
      context: context,
      title: 'USER.DELETE'.tr(),
      message: 'USER.DELETE_MESSAGE'.tr(),
      okLabel: 'SETTINGS_PAGE.DIALOG.DELETE_ACCOUNT_TITLE'.tr(),
      cancelLabel: 'FOOTER.CANCEL'.tr(),
    );
    if (!confirmed) return;

    try {
      await ServiceLocator.userAccount.deleteUserAccount();
      if (!mounted) return;
      await _showInfoDialog(
        title: 'USER.DELETE_MESSAGE'.tr(),
        message: 'USER.DELETE_FEEDBACK'.tr(),
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => Authenticate()),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;
      await _showInfoDialog(
        title: 'SETTINGS_PAGE.DIALOG.ERROR_TITLE'.tr(),
        message: 'SETTINGS_PAGE.DIALOG.DELETE_ERROR'.tr(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
      );
    }

    final canSave =
        _hasChanges &&
        !_saving &&
        _emailError == null &&
        _usernameError == null;

    const double bottomActionHeight = 120.0;
    final double bottomSafePadding = MediaQuery.of(context).padding.bottom;
    final double bottomReserved = bottomActionHeight + bottomSafePadding + 8;
    return Focus(
      focusNode: _blankFocus,
      skipTraversal: true,
      canRequestFocus: true,
      child: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(
              16.0,
            ).copyWith(bottom: bottomReserved),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionTitle('SETTINGS_PAGE.SECTIONS.ACCOUNT_INFO.TITLE'.tr()),
                const SizedBox(height: 8),
                ValueListenableBuilder<ThemePalette>(
                  valueListenable: ThemeConfig.palette,
                  builder: (context, palette, _) {
                    return TextField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: 'SETTINGS_PAGE.SECTIONS.ACCOUNT_INFO.EMAIL'
                            .tr(),
                        labelStyle: const TextStyle(color: Colors.white70),
                        enabledBorder: const UnderlineInputBorder(
                          borderSide: BorderSide(color: Colors.white24),
                        ),
                        focusedBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: palette.primary),
                        ),
                      ).copyWith(errorText: _emailError),
                      style: const TextStyle(color: Colors.white),
                      onChanged: (v) => _validateEmail(v),
                      inputFormatters: [LengthLimitingTextInputFormatter(100)],
                    );
                  },
                ),
                const SizedBox(height: 12),
                ValueListenableBuilder<ThemePalette>(
                  valueListenable: ThemeConfig.palette,
                  builder: (context, palette, _) {
                    return TextField(
                      controller: _usernameCtrl,
                      decoration: InputDecoration(
                        labelText:
                            'SETTINGS_PAGE.SECTIONS.ACCOUNT_INFO.USERNAME'.tr(),
                        labelStyle: const TextStyle(color: Colors.white70),
                        enabledBorder: const UnderlineInputBorder(
                          borderSide: BorderSide(color: Colors.white24),
                        ),
                        focusedBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: palette.primary),
                        ),
                      ).copyWith(errorText: _usernameError),
                      style: const TextStyle(color: Colors.white),
                      onChanged: (v) => _validateUsername(v),
                      inputFormatters: [LengthLimitingTextInputFormatter(20)],
                    );
                  },
                ),
                const SizedBox(height: 24),
                ValueListenableBuilder<ThemePalette>(
                  valueListenable: ThemeConfig.palette,
                  builder: (context, palette, _) {
                    final previewPath = _selectedAvatar ?? _initialAvatar;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: Container(
                            width: 200,
                            height: 200,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.black.withValues(alpha: 0.15),
                              border: Border.all(
                                color: palette.primary,
                                width: 2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: palette.primaryBoxShadow,
                                  offset: const Offset(0, 2),
                                  blurRadius: 6,
                                ),
                              ],
                            ),
                            child: ClipOval(
                              child: _buildAvatarPreview(
                                src: previewPath,
                                palette: palette,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Center(
                          child: OutlinedButton.icon(
                            onPressed: _uploadingAvatar
                                ? null
                                : _captureAndUploadAvatar,
                            icon: const Icon(Icons.photo_camera),
                            label: Text(
                              _uploadingAvatar
                                  ? 'Envoi…'
                                  : 'SETTINGS_PAGE.SECTIONS.PROFILE_PICTURE.UPLOAD'
                                        .tr(),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: palette.primary,
                              side: BorderSide(
                                color: palette.primary,
                                width: 3,
                              ),
                              shape: const StadiumBorder(),
                              textStyle: const TextStyle(
                                fontFamily: FontFamily.PAPYRUS,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),

                _SectionTitle('Avatar'),
                LayoutBuilder(
                  builder: (context, constraints) {
                    int columns = 6;
                    return GridView.builder(
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        mainAxisSpacing: 6,
                        crossAxisSpacing: 6,
                        childAspectRatio: 1.0,
                      ),
                      itemCount: _availableAvatars.length,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemBuilder: (context, i) {
                        final path = _availableAvatars[i];
                        final selected = path == _selectedAvatar;
                        return ValueListenableBuilder<ThemePalette>(
                          valueListenable: ThemeConfig.palette,
                          builder: (context, palette, _) {
                            return InkWell(
                              onTap: () =>
                                  setState(() => _selectedAvatar = path),
                              child: Align(
                                alignment: Alignment.center,
                                child: FractionallySizedBox(
                                  widthFactor: 0.8,
                                  heightFactor: 0.8,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: selected
                                            ? palette.primary
                                            : Colors.transparent,
                                        width: 2,
                                      ),
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.asset(
                                        path,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        );
                      },
                    );
                  },
                ),
                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.redAccent.withOpacity(0.6),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'SETTINGS_PAGE.SECTIONS.DANGER_ZONE.TITLE'.tr(),
                        style: TextStyle(
                          color: Colors.redAccent,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          fontFamily: FontFamily.PAPYRUS,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: _deleteAccount,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.redAccent.shade700,
                            foregroundColor: Colors.white,
                            shape: const StadiumBorder(),
                            textStyle: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              fontFamily: FontFamily.PAPYRUS,
                            ),
                          ),
                          icon: const Icon(Icons.delete_outline),
                          label: Text(
                            'SETTINGS_PAGE.SECTIONS.DANGER_ZONE.DELETE_ACCOUNT'
                                .tr(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.40),
                  border: const Border(
                    top: BorderSide(color: Colors.white24, width: 1),
                  ),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: ValueListenableBuilder<ThemePalette>(
                      valueListenable: ThemeConfig.palette,
                      builder: (context, palette, _) {
                        return Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Tooltip(
                                  message: 'SETTINGS_PAGE.DISCARD_BUTTON'.tr(),
                                  child: IconButton(
                                    onPressed: (_hasChanges && !_saving)
                                        ? _restoreOriginalState
                                        : null,
                                    icon: const Icon(Icons.undo_rounded),
                                    color: (_hasChanges && !_saving)
                                        ? palette.primary
                                        : palette.mainTextColor.withOpacity(
                                            0.4,
                                          ),
                                  ),
                                ),
                                Expanded(
                                  child: SizedBox(
                                    height: 56,
                                    child: (!canSave)
                                        ? ElevatedButton(
                                            onPressed: null,
                                            style: ElevatedButton.styleFrom(
                                              disabledBackgroundColor: palette
                                                  .secondaryDark
                                                  .withOpacity(0.7),
                                              disabledForegroundColor: palette
                                                  .mainTextColor
                                                  .withOpacity(0.7),
                                              shape: const StadiumBorder(),
                                              textStyle: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.w700,
                                                fontFamily: FontFamily.PAPYRUS,
                                              ),
                                            ),
                                            child: Text(
                                              'SETTINGS_PAGE.SAVE_BUTTON'.tr(),
                                            ),
                                          )
                                        : AppPrimaryButton(
                                            label: 'SETTINGS_PAGE.SAVE_BUTTON'
                                                .tr(),
                                            height: 56,
                                            width: double.infinity,
                                            onPressed: _saving ? () {} : _save,
                                          ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
