import 'dart:convert';
import 'package:client_leger/screens/join-session/join-session.dart';
import 'package:client_leger/models/waiting_room.dart';
import 'package:client_leger/services/waiting/waiting_rooms_service.dart';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/screens/settings/settings.dart';
import 'package:client_leger/screens/shop/shop.dart';
import 'package:client_leger/screens/rankings/rankings.dart';
import 'package:easy_localization/easy_localization.dart';

class SessionListPage extends StatefulWidget {
  const SessionListPage({super.key});

  @override
  State<SessionListPage> createState() => _SessionListPageState();
}

class _SessionListPageState extends State<SessionListPage> {
  final _service = WaitingRoomsService();
  Stream<List<WaitingRoomInfo>> _rooms$ = const Stream.empty();
  bool _initialLoading = true;

  @override
  void initState() {
    super.initState();
    _rooms$ = _service.rooms$;
    _setup();
  }

  void _setup() async {
    await _service.initialize();
    _rooms$ = _service.rooms$;
    _service.request();
    Future.delayed(const Duration(seconds: 3), () {
      if (!mounted) return;
      if (_initialLoading) setState(() => _initialLoading = false);
    });
  }

  @override
  void dispose() {
    _service.dispose();
    super.dispose();
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
                    title: 'SESSION_LIST.TITLE'.tr(),
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
                  Expanded(
                    child: Column(
                      children: [
                        Expanded(
                          child: StreamBuilder<List<WaitingRoomInfo>>(
                            stream: _rooms$,
                            builder: (context, snapshot) {
                              final rooms =
                                  snapshot.data ?? const <WaitingRoomInfo>[];
                              if (_initialLoading && !snapshot.hasData) {
                                return const Center(
                                  child: CircularProgressIndicator(
                                    color: Colors.white70,
                                  ),
                                );
                              }
                              if (rooms.isEmpty) {
                                return Center(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 24.0,
                                    ),
                                    child: Text(
                                      'SESSION_LIST.NO_SESSIONS'.tr(),
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        fontFamily: FontFamily.PAPYRUS,
                                        fontSize: 26,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                );
                              }
                              return LayoutBuilder(
                                builder: (context, constraints) {
                                  final cardWidth = constraints.maxWidth / 4;
                                  return GridView.builder(
                                    padding: const EdgeInsets.fromLTRB(
                                      20,
                                      8,
                                      20,
                                      8,
                                    ),
                                    gridDelegate:
                                        SliverGridDelegateWithMaxCrossAxisExtent(
                                          maxCrossAxisExtent: cardWidth,
                                          mainAxisSpacing: 16,
                                          crossAxisSpacing: 16,
                                          childAspectRatio: 0.6,
                                        ),
                                    itemCount: rooms.length,
                                    itemBuilder: (context, index) =>
                                        _WaitingRoomCard(room: rooms[index]),
                                  );
                                },
                              );
                            },
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ConstrainedBox(
                                constraints: const BoxConstraints.tightFor(
                                  width: 340,
                                  height: 60,
                                ),
                                child: AppPrimaryButton(
                                  label: 'JOIN_PAGE.JOIN_CODE'.tr(),
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => const JoinSession(),
                                      ),
                                    );
                                  },
                                  height: 60,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Tooltip(
                                message: 'SESSION_LIST.SCAN_QR_TOOLTIP'.tr(),
                                child: ValueListenableBuilder<ThemePalette>(
                                  valueListenable: ThemeConfig.palette,
                                  builder: (context, palette, _) {
                                    final borderRadius = BorderRadius.circular(
                                      30,
                                    );
                                    final shadows = <BoxShadow>[
                                      BoxShadow(
                                        color: palette.primaryBoxShadow,
                                        blurRadius: 10,
                                        spreadRadius: 3,
                                        offset: const Offset(0, 0),
                                      ),
                                      BoxShadow(
                                        color: palette.secondaryDark.withValues(
                                          alpha: 0.8,
                                        ),
                                        blurRadius: 12,
                                        spreadRadius: 1,
                                        offset: const Offset(0, 6),
                                      ),
                                      BoxShadow(
                                        color: const Color(
                                          0xFFFFFFF0,
                                        ).withValues(alpha: 0.9),
                                        blurRadius: 4,
                                        spreadRadius: -4,
                                        offset: const Offset(0, -3),
                                      ),
                                    ];

                                    final decoration = BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: palette.primaryGradientColors,
                                        stops: palette.primaryGradientStops,
                                        begin: const Alignment(-1, 0),
                                        end: const Alignment(1, 0),
                                      ),
                                      borderRadius: borderRadius,
                                      border: Border.all(
                                        color: palette.primaryLight,
                                        width: 2.0,
                                      ),
                                      boxShadow: shadows,
                                    );

                                    return Material(
                                      color: Colors.transparent,
                                      borderRadius: borderRadius,
                                      child: InkWell(
                                        onTap: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => const JoinSession(
                                                autoScanQr: true,
                                              ),
                                            ),
                                          );
                                        },
                                        borderRadius: borderRadius,
                                        splashColor: palette.invertedTextColor
                                            .withValues(alpha: 0.16),
                                        highlightColor: Colors.transparent,
                                        child: Container(
                                          decoration: decoration,
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 16,
                                            vertical: 12,
                                          ),
                                          child: Icon(
                                            Icons.qr_code_scanner,
                                            color: palette.invertedTextColor,
                                            size: 28,
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WaitingRoomCard extends StatelessWidget {
  const _WaitingRoomCard({required this.room});
  final WaitingRoomInfo room;

  @override
  Widget build(BuildContext context) {
    Widget image;
    if (room.gameImage.startsWith('data:image')) {
      final comma = room.gameImage.indexOf(',');
      final base64Part = comma >= 0
          ? room.gameImage.substring(comma + 1)
          : room.gameImage;
      try {
        final bytes = base64Decode(base64Part);
        image = ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Transform.scale(
            scale: 1.15, // Zoom in a bit to cover the card nicely
            child: Image.memory(
              bytes,
              height: 175,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
        );
      } catch (_) {
        image = Container(
          height: 140,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white10,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white24),
          ),
          alignment: Alignment.center,
          child: const Icon(Icons.image, color: Colors.white54),
        );
      }
    } else if (room.gameImage.isEmpty) {
      image = Container(
        height: 140,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white10,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white24),
        ),
        alignment: Alignment.center,
        child: const Icon(Icons.image, color: Colors.white54),
      );
    } else {
      image = ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          room.gameImage,
          height: 140,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            height: 140,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white10,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white24),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.image, color: Colors.white54),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white24, width: 1.5),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          image,
          const SizedBox(height: 12),
          ValueListenableBuilder<ThemePalette>(
            valueListenable: ThemeConfig.palette,
            builder: (context, palette, _) {
              return Text(
                room.gameName.isNotEmpty
                    ? room.gameName
                    : 'SESSION_LIST.NO_NAME'.tr(),
                style: TextStyle(
                  fontFamily: FontFamily.PAPYRUS,
                  fontSize: 24,
                  color: palette.primaryText,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                ),
              );
            },
          ),
          const SizedBox(height: 8),
          Text(
            room.roomId,
            style: const TextStyle(
              fontFamily: FontFamily.PAPYRUS,
              fontSize: 26,
              color: Colors.white,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          const Divider(color: Colors.white24),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Info(
                      icon: Icons.login,
                      text: room.dropInEnabled
                          ? 'SESSION_LIST.DROP_IN_ENABLED'.tr()
                          : 'SESSION_LIST.DROP_IN_DISABLED'.tr(),
                    ),
                    const SizedBox(height: 6),
                    _Info(
                      icon: Icons.lock_open,
                      text: _availabilityLabel(room.gameAvailability),
                    ),
                    const SizedBox(height: 6),
                    _Info(icon: Icons.attach_money, text: '${room.entryFee}'),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Info(
                      icon: Icons.grid_on,
                      text: '${room.gameDimension} x ${room.gameDimension}',
                    ),
                    const SizedBox(height: 6),
                    _Info(
                      icon: Icons.map,
                      text: (() {
                        final parts = room.gameMode.split('.');
                        final last = parts.isNotEmpty
                            ? parts.last.toLowerCase()
                            : '';
                        if (last == 'classic') return 'GAME.MODE.CLASSIC'.tr();
                        if (last == 'ctf') return 'GAME.MODE.CTF'.tr();
                        return _modeLabel(room.gameMode);
                      })(),
                    ),
                    const SizedBox(height: 6),
                    _Info(
                      icon: Icons.people,
                      text:
                          '${room.playerCount}/${room.maxPlayers} ' +
                          'GAME.PLAYERS'.tr(),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: AppPrimaryButton(
              label: 'SESSION_LIST.JOIN'.tr(),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => JoinSession(
                      initialAccessCode: room.roomId,
                      autoJoin: true,
                    ),
                  ),
                );
              },
              height: 40,
              fontSize: 20,
            ),
          ),
        ],
      ),
    );
  }

  static String _availabilityLabel(String a) {
    switch (a) {
      case 'public':
      case 'Public':
        return 'SESSION_LIST.AVAILABILITY.PUBLIC'.tr();
      case 'friendsOnly':
      case 'friends-only':
      case 'FriendsOnly':
        return 'SESSION_LIST.AVAILABILITY.FRIENDS_ONLY'.tr();
      case 'private':
      case 'Private':
        return 'SESSION_LIST.AVAILABILITY.PRIVATE'.tr();
      default:
        return 'SESSION_LIST.AVAILABILITY.UNKNOWN'.tr();
    }
  }

  static String _modeLabel(String s) {
    switch (s.toLowerCase()) {
      case 'classic':
      case 'classique':
        return 'GAME.MODE.CLASSIC'.tr();
      default:
        return s.isEmpty ? '—' : s;
    }
  }
}

class _Info extends StatelessWidget {
  const _Info({this.icon, required this.text});
  final IconData? icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final style = const TextStyle(
      color: Colors.white,
      fontSize: 16,
      fontFamily: FontFamily.PAPYRUS,
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 16, color: Colors.white70),
          const SizedBox(width: 6),
        ],
        Text(text, style: style),
      ],
    );
  }
}
