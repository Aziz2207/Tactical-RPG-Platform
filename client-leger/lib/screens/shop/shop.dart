import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/services/shop/shop_service.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/screens/rankings/rankings.dart';
import 'package:client_leger/widgets/shop/shop_card.dart';
import 'package:client_leger/screens/settings/settings.dart';
import 'package:client_leger/services/authentification/logout_flow.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';
import 'package:client_leger/models/shop/shop_items.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:client_leger/widgets/common/chat_friends_overlay.dart';

class ShopPage extends StatefulWidget {
  const ShopPage({super.key});

  @override
  State<ShopPage> createState() => _ShopPageState();
}

class _ShopPageState extends State<ShopPage> {
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
                    title: 'SHOP_PAGE.TITLE'.tr(),
                    showShop: false,
                    onBack: () => Navigator.of(context).maybePop(),
                    onTapRankings: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const RankingsPage()),
                      );
                    },
                    onTapSettings: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const SettingsPage()),
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
                                    isScrollable: true,
                                    indicatorColor: palette.primary,
                                    labelColor: palette.primary,
                                    unselectedLabelColor: palette.mainTextColor
                                        .withOpacity(0.7),
                                    labelStyle: const TextStyle(
                                      fontFamily: FontFamily.PAPYRUS,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 18,
                                    ),
                                    tabs: [
                                      Tab(text: 'SHOP_PAGE.AVATARS'.tr()),
                                      Tab(text: 'SHOP_PAGE.BACKGROUNDS'.tr()),
                                      Tab(text: 'SHOP_PAGE.THEMES'.tr()),
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
                                _AvatarsTab(shop: _shop),
                                _BackgroundsTab(shop: _shop),
                                _ThemesTab(shop: _shop),
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

class _AvatarsTab extends StatefulWidget {
  final ShopService shop;
  const _AvatarsTab({required this.shop});

  @override
  State<_AvatarsTab> createState() => _AvatarsTabState();
}

class _AvatarsTabState extends State<_AvatarsTab> {
  late Future<void> _loadFuture;
  List<dynamic> _items = [];
  Set<String> _owned = {};
  int _balance = 0;
  final Set<String> _purchasing = {};

  @override
  void initState() {
    super.initState();
    _loadFuture = _loadData();
  }

  Future<void> _loadData() async {
    final items = await widget.shop.getAvailableAvatars();
    final ownedUrls = await widget.shop.getOwnedAvatarUrls();
    final owned = ownedUrls.map((s) => s.split('/').last.trim()).toSet();
    final balance = await ServiceLocator.userAccount.getBalance();
    setState(() {
      _items = items;
      _owned = owned;
      _balance = balance;
    });
  }

  String _assetForAvatarName(String name) {
    final safe = name.trim();
    return 'assets/images/characters/$safe.webp';
  }

  String _filenameForAvatarName(String name) => '${name.trim()}.webp';

  Future<void> _purchase(String filename, int price) async {
    if (_purchasing.contains(filename)) return;
    setState(() => _purchasing.add(filename));
    try {
      final updatedOwned = await widget.shop.purchaseAvatarByFilename(
        filename,
        price,
      );
      final newBalance = await ServiceLocator.userAccount.getBalance();
      setState(() {
        _owned = updatedOwned.toSet();
        _balance = newBalance;
      });
    } finally {
      if (mounted) setState(() => _purchasing.remove(filename));
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _loadFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Text(
              'SHOP_PAGE.ERROR'.tr(),
              style: const TextStyle(color: Colors.redAccent),
            ),
          );
        }
        final items = _items;
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: LayoutBuilder(
            builder: (context, constraints) {
              int columns = 4;

              return GridView.builder(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  mainAxisSpacing: 24,
                  crossAxisSpacing: 24,
                  childAspectRatio: 0.6,
                ),
                itemCount: items.length,
                itemBuilder: (context, i) {
                  final a = items[i];
                  final filename = _filenameForAvatarName(a.name);
                  final owned = _owned.contains(filename);
                  final affordable = _balance >= (a.price as int);
                  final busy = _purchasing.contains(filename);

                  return ValueListenableBuilder<ThemePalette>(
                    valueListenable: ThemeConfig.palette,
                    builder: (context, palette, _) {
                      Widget action;
                      if (owned) {
                        action = ElevatedButton(
                          onPressed: null,
                          style: ElevatedButton.styleFrom(
                            disabledBackgroundColor: const Color(
                              0xFF2E7D32,
                            ).withOpacity(0.45),
                            disabledForegroundColor: const Color(0xFF66BB6A),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text('SHOP_PAGE.OWNED'.tr()),
                        );
                      } else if (!affordable) {
                        action = ElevatedButton(
                          onPressed: null,
                          style: ElevatedButton.styleFrom(
                            disabledBackgroundColor: palette.secondaryDark
                                .withOpacity(0.7),
                            disabledForegroundColor: palette.mainTextColor
                                .withOpacity(0.7),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text('SHOP_PAGE.INSUFFICIENT_BALANCE'.tr()),
                        );
                      } else if (busy) {
                        action = const SizedBox(
                          width: 48,
                          height: 48,
                          child: Center(
                            child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        );
                      } else {
                        action = AppPrimaryButton(
                          label: 'SHOP_PAGE.BUY'.tr(),
                          height: 52,
                          width: double.infinity,
                          onPressed: () => _purchase(filename, a.price as int),
                        );
                      }

                      return ShopCard(
                        imageUrl: _assetForAvatarName(a.name),
                        title: a.name,
                        subtitle: '${a.price} ${'SHOP_PAGE.CURRENCY'.tr()}',
                        useAsset: true,
                        imageScale: 1.0,
                        imageFlex: 3,
                        dimmed: owned,
                        badgeText: owned ? 'SHOP_PAGE.OWNED'.tr() : null,
                        badgeColor: const Color(0xFF2E7D32).withOpacity(0.55),
                        badgeTextColor: Colors.white,
                        centerAction: true,
                        actionFullWidth: true,
                        action: action,
                      );
                    },
                  );
                },
              );
            },
          ),
        );
      },
    );
  }
}

class _BackgroundsTab extends StatefulWidget {
  final ShopService shop;
  const _BackgroundsTab({required this.shop});

  @override
  State<_BackgroundsTab> createState() => _BackgroundsTabState();
}

class _BackgroundsTabState extends State<_BackgroundsTab> {
  late Future<void> _loadFuture;
  List<dynamic> _items = [];
  Set<String> _owned = {};
  int _balance = 0;
  final Set<String> _purchasing = {};

  @override
  void initState() {
    super.initState();
    _loadFuture = _loadData();
  }

  Future<void> _loadData() async {
    final items = await widget.shop.getAvailableBackgrounds();
    final owned = (await widget.shop.getOwnedBackgroundFilenames()).toSet();
    final balance = await ServiceLocator.userAccount.getBalance();
    setState(() {
      _items = items;
      _owned = owned;
      _balance = balance;
    });
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

  String _filenameFromAny(String pathOrUrl) => pathOrUrl.split('/').last.trim();

  Future<void> _purchase(String filename, int price) async {
    if (_purchasing.contains(filename)) return;
    setState(() => _purchasing.add(filename));
    try {
      final updatedOwned = await widget.shop.purchaseBackgroundByFilename(
        filename,
        price,
      );
      final newBalance = await ServiceLocator.userAccount.getBalance();
      setState(() {
        _owned = updatedOwned.toSet();
        _balance = newBalance;
      });
    } catch (e) {
    } finally {
      if (mounted) setState(() => _purchasing.remove(filename));
    }
  }

  String translateKey(dynamic value) {
    if (value == null) return "";
    final key = value.toString();
    return key.tr();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _loadFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Text(
              'SHOP_PAGE.ERROR'.tr(),
              style: const TextStyle(color: Colors.redAccent),
            ),
          );
        }
        final items = _items;
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: LayoutBuilder(
            builder: (context, constraints) {
              int columns = 3;

              return GridView.builder(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 0.95,
                ),
                itemCount: items.length,
                itemBuilder: (context, i) {
                  final b = items[i];
                  final assetPath = _assetForBackgroundUrl(b.imageUrl);
                  final filename = _filenameFromAny(assetPath);
                  final owned = _owned.contains(filename);
                  final affordable = _balance >= (b.price as int);
                  final busy = _purchasing.contains(filename);
                  return ValueListenableBuilder<ThemePalette>(
                    valueListenable: ThemeConfig.palette,
                    builder: (context, palette, _) {
                      Widget action;
                      if (owned) {
                        action = ElevatedButton(
                          onPressed: null,
                          style: ElevatedButton.styleFrom(
                            disabledBackgroundColor: const Color(
                              0xFF2E7D32,
                            ).withOpacity(0.45),
                            disabledForegroundColor: const Color(0xFF66BB6A),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text('SHOP_PAGE.OWNED'.tr()),
                        );
                      } else if (!affordable) {
                        action = ElevatedButton(
                          onPressed: null,
                          style: ElevatedButton.styleFrom(
                            disabledBackgroundColor: palette.secondaryDark
                                .withOpacity(0.7),
                            disabledForegroundColor: palette.mainTextColor
                                .withOpacity(0.7),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text('SHOP_PAGE.INSUFFICIENT_BALANCE'.tr()),
                        );
                      } else if (busy) {
                        action = const SizedBox(
                          width: 48,
                          height: 48,
                          child: Center(
                            child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        );
                      } else {
                        action = AppPrimaryButton(
                          label: 'SHOP_PAGE.BUY'.tr(),
                          height: 52,
                          width: double.infinity,
                          onPressed: () => _purchase(filename, b.price as int),
                        );
                      }

                      return ShopCard(
                        imageUrl: assetPath,
                        title: translateKey(b.title),
                        subtitle: '${b.price} ${'SHOP_PAGE.CURRENCY'.tr()}',
                        useAsset: true,
                        imageFit: BoxFit.cover,
                        cornerRadius: 16,
                        imageAspectRatio: 2,
                        imageScale: 1.25,
                        dimmed: owned,
                        badgeText: owned ? 'SHOP_PAGE.OWNED'.tr() : null,
                        badgeColor: const Color(0xFF2E7D32).withOpacity(0.55),
                        badgeTextColor: Colors.white,
                        centerAction: true,
                        actionFullWidth: true,
                        action: action,
                      );
                    },
                  );
                },
              );
            },
          ),
        );
      },
    );
  }
}

class _ThemesTab extends StatefulWidget {
  final ShopService shop;
  const _ThemesTab({required this.shop});

  @override
  State<_ThemesTab> createState() => _ThemesTabState();
}

class _ThemesTabState extends State<_ThemesTab> {
  late Future<void> _loadFuture;
  List<dynamic> _items = [];
  Set<String> _owned = {};
  int _balance = 0;
  final Set<String> _purchasing = {};

  @override
  void initState() {
    super.initState();
    _loadFuture = _loadData();
  }

  Future<void> _loadData() async {
    final items = await widget.shop.getAvailableThemes();
    final balance = await ServiceLocator.userAccount.getBalance();
    final owned = items
        .where((e) => e.owned == true)
        .map<String>((e) => _themeIdentifierFor(e))
        .toSet();
    setState(() {
      _items = items;
      _balance = balance;
      _owned = owned;
    });
  }

  String _idFromLabel(String label) {
    final lower = label.trim().toLowerCase();
    if (lower.contains('.')) return lower.split('.').last;
    return lower;
  }

  String _themeIdentifierFor(ShopThemeItem t) {
    final cc = (t.colorClass ?? '').trim().toLowerCase();
    if (cc.isNotEmpty) return cc;
    return _idFromLabel(t.label);
  }

  List<Color> _previewColorsFor(ShopThemeItem t) {
    String id = _themeIdentifierFor(t);
    id = id.replaceAll('_', '-').replaceAll(' ', '-');
    final names = ThemeConfig.availableThemeNames;
    final idx = names.indexWhere((n) => n.toLowerCase() == id);
    final canonical = idx >= 0 ? names[idx] : id;

    final pal = ThemeConfig.previewPaletteForName(canonical);
    if (pal != null) {
      return [pal.primary, pal.secondary, pal.secondaryDark];
    }
    return const [Color(0xFFE0E0E0), Color(0xFF9E9E9E), Color(0xFF424242)];
  }

  Future<void> _purchase(String identifier, int price) async {
    if (_purchasing.contains(identifier)) return;
    setState(() => _purchasing.add(identifier));
    try {
      final updatedOwned = await widget.shop.purchaseTheme(identifier, price);
      final newBalance = await ServiceLocator.userAccount.getBalance();
      setState(() {
        _owned = updatedOwned.toSet();
        _balance = newBalance;
        _items = _items.map((e) {
          if (e is ShopThemeItem && _themeIdentifierFor(e) == identifier) {
            return ShopThemeItem(
              id: e.id,
              label: e.label,
              price: e.price,
              owned: true,
              colorClass: e.colorClass,
            );
          }
          return e;
        }).toList();
      });
    } finally {
      if (mounted) setState(() => _purchasing.remove(identifier));
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _loadFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Text(
              'SHOP_PAGE.ERROR'.tr(),
              style: const TextStyle(color: Colors.redAccent),
            ),
          );
        }
        final items = _items.cast<ShopThemeItem>();
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 4,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.95,
                ),
                itemCount: items.length,
                itemBuilder: (context, i) {
                  final t = items[i];
                  final identifier = _themeIdentifierFor(t);
                  final owned = _owned.contains(identifier);
                  final affordable = _balance >= t.price;
                  final busy = _purchasing.contains(identifier);
                  final colors = _previewColorsFor(t);
                  return ValueListenableBuilder<ThemePalette>(
                    valueListenable: ThemeConfig.palette,
                    builder: (context, palette, _) {
                      Widget action;
                      if (owned) {
                        action = ElevatedButton(
                          onPressed: null,
                          style: ElevatedButton.styleFrom(
                            disabledBackgroundColor: const Color(
                              0xFF2E7D32,
                            ).withOpacity(0.45),
                            disabledForegroundColor: const Color(0xFF66BB6A),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text('SHOP_PAGE.OWNED'.tr()),
                        );
                      } else if (!affordable) {
                        action = ElevatedButton(
                          onPressed: null,
                          style: ElevatedButton.styleFrom(
                            disabledBackgroundColor: palette.secondaryDark
                                .withOpacity(0.7),
                            disabledForegroundColor: palette.mainTextColor
                                .withOpacity(0.7),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text('SHOP_PAGE.INSUFFICIENT_BALANCE'.tr()),
                        );
                      } else if (busy) {
                        action = const SizedBox(
                          width: 48,
                          height: 48,
                          child: Center(
                            child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        );
                      } else {
                        action = AppPrimaryButton(
                          label: 'SHOP_PAGE.BUY'.tr(),
                          height: 52,
                          width: double.infinity,
                          onPressed: () => _purchase(identifier, t.price),
                        );
                      }

                      return AnimatedOpacity(
                        duration: const Duration(milliseconds: 180),
                        opacity: owned ? 0.8 : 1.0,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.6),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white24),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              ClipRRect(
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(16),
                                  topRight: Radius.circular(16),
                                ),
                                child: AspectRatio(
                                  aspectRatio: 2,
                                  child: Column(
                                    children: [
                                      Expanded(
                                        child: Container(color: colors[0]),
                                      ),
                                      Expanded(
                                        child: Container(color: colors[1]),
                                      ),
                                      Expanded(
                                        child: Container(color: colors[2]),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      t.label.tr(),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 20,
                                        fontFamily: 'Papyrus',
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      '${t.price} ${'SHOP_PAGE.CURRENCY'.tr()}',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        fontFamily: 'Papyrus',
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    SizedBox(
                                      width: double.infinity,
                                      child: action,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              );
            },
          ),
        );
      },
    );
  }
}
