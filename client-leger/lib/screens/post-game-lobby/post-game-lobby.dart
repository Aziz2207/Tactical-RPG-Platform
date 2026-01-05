import 'dart:async';

import 'package:client_leger/screens/settings/settings.dart';
import 'package:client_leger/screens/shop/shop.dart';
import 'package:client_leger/screens/menu/menu.dart';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:client_leger/services/user-account/user-account.dart';
import 'package:client_leger/services/post-game/post_game_service.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/header/app_header.dart';
import 'package:client_leger/services/authentification/logout_flow.dart';
import 'package:client_leger/widgets/waiting/waiting_chat.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/models/global_stat.dart';
import 'package:client_leger/models/post_game_attribute.dart';
import 'package:client_leger/widgets/post-game/single_global_stat.dart';
import 'package:client_leger/widgets/post-game/post_game_attribute_header.dart';
import 'package:client_leger/widgets/post-game/grouped_post_game_attribute_header.dart';
import 'package:client_leger/widgets/post-game/player_statistics.dart';
import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:flutter/foundation.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:easy_localization/easy_localization.dart';

class PostGameLobby extends StatefulWidget {
  final VoidCallback? onQuit;
  final List<PostGameAttribute> postGameAttributes;
  final dynamic gameRoomService;

  const PostGameLobby({
    Key? key,
    this.onQuit,
    this.postGameAttributes = const [],
    required this.gameRoomService,
  }) : super(key: key);

  @override
  State<PostGameLobby> createState() => _PostGameLobbyState();
}

class _PostGameLobbyState extends State<PostGameLobby> {
  StreamSubscription? _listAllPlayersSub;
  String? currentPlayerId;
  SocketService? socket;

  bool showBalanceBreakdown = false;
  String selectedAttribute = '';
  Map<String, PostGameSortOrder> sortOrders = {};
  List<Player> sortedPlayers = [];
  List<Player> allPlayers = [];

  Map<String, dynamic>? currentRoom;
  int totalTerrainTiles = 0;
  int totalDoors = 0;

  List<GlobalStat> globalStats = [];
  late final UserAccountService _userAccountService;
  late final PostGameService _postGameService;

  int? _cachedBalanceVariation;
  bool _balanceAdjusted = false;
  String _username = '';

  @override
  void initState() {
    super.initState();
    _initializeUsername();
    socket = SocketService.I;
    socket?.connect();
    currentPlayerId = socket?.id ?? "";
    _userAccountService = ServiceLocator.userAccount;
    _postGameService = PostGameService.I;
    _bindToGameRoomService();
  }

  Future<void> _initializeUsername() async {
    final profile = await AuthService().getCurrentUserProfile();
    final user = FirebaseAuth.instance.currentUser;
    final name = profile?.username ?? user?.email ?? 'Player';
    if (mounted) setState(() => _username = name);
  }

  @override
  void dispose() {
    _listAllPlayersSub?.cancel();
    super.dispose();
  }

  void _bindToGameRoomService() {
    if (widget.gameRoomService.currentRoom != null) {
      setState(() {
        currentRoom = widget.gameRoomService.currentRoom;
        _updateGameStats();
      });
    }

    widget.gameRoomService.room$.listen((room) {
      if (mounted && room != null) {
        setState(() {
          currentRoom = room;
          _updateGameStats();
        });
      }
    });

    _listAllPlayersSub = widget.gameRoomService.listPlayers$.listen((
      listAllPlayers,
    ) {
      if (mounted) {
        setState(() {
          allPlayers = listAllPlayers;

          _postGameService.calculatePlayerStats(allPlayers, totalTerrainTiles);
          _updateGameStats();

          if (sortOrders.isEmpty) {
            sortedPlayers = List.from(allPlayers);
          } else {
            final currentAttribute = sortOrders.keys.first;
            final currentOrder = sortOrders[currentAttribute]!;
            sortedPlayers = _postGameService.sortPlayers(
              allPlayers,
              currentAttribute,
              currentOrder,
            );
          }

          if (!_balanceAdjusted &&
              allPlayers.isNotEmpty &&
              currentPlayerId != null) {
            _adjustBalanceOnce();
          }
        });
      }
    });
  }

  void _adjustBalanceOnce() {
    try {
      final variation = _postGameService.computeBalanceVariation(
        currentPlayerId,
        allPlayers,
        currentRoom,
        _postGameService.isFlagMode(currentRoom),
      );

      if (variation != null) {
        _cachedBalanceVariation = variation;
        _userAccountService.adjustBalance(
          variation,
          addToLifetimeEarnings: true,
        );
        _balanceAdjusted = true;
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error adjusting balance: $e');
      }
    }
  }

  void _updateGameStats() {
    totalTerrainTiles = _postGameService.calculateTotalTerrainTiles(
      currentRoom,
    );
    totalDoors = _postGameService.calculateTotalDoors(currentRoom);

    final statsData = _postGameService.computeGlobalStats(
      currentRoom,
      totalTerrainTiles,
      totalDoors,
      allPlayers,
    );

    globalStats = _postGameService.buildGlobalStatsList(statsData);
  }

  @override
  Widget build(BuildContext context) {
    final isKeyboardVisible = MediaQuery.of(context).viewInsets.bottom > 0;
    final hideSidePanels = isKeyboardVisible;

    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, _) {
        return Scaffold(
          body: ThemedBackground(
            child: Column(
              children: [
                AppHeader(
                  title: _postGameService.isFlagMode(currentRoom)
                      ? "${'POST_GAME_LOBBY.TITLE'.tr()}: ${'POST_GAME_LOBBY.CTF'.tr()}"
                      : "${'POST_GAME_LOBBY.TITLE'.tr()}: ${'POST_GAME_LOBBY.CLASSIC'.tr()}",
                  showRankings: false,
                  showShop: false,
                  showSettings: false,
                  showLogout: false,
                  showBack: false,
                  onBack: () => Navigator.of(context).maybePop(),
                  onTapShop: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const ShopPage()),
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
                Expanded(
                  child: Row(
                    children: [
                      SizedBox(
                        width: MediaQuery.of(context).size.width * 0.25,
                        child: Column(
                          children: [
                            SizedBox(height: 32),
                            if (!hideSidePanels)
                              _buildBalanceVariation(palette),
                            SizedBox(height: 20),

                            if (!hideSidePanels) SizedBox(height: 20),

                            if (!hideSidePanels) _buildGlobalStats(palette),
                            SizedBox(height: 10),
                            Expanded(
                              child: Padding(
                                padding: EdgeInsets.symmetric(horizontal: 20),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: WaitingChat(
                                    roomCode: currentRoom!["roomId"] ?? "",
                                    username: _username,
                                    compact: true,
                                    reactionsGrid: true,
                                    reactionsGridColumns: 2,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          children: [
                            _buildAttributesHeader(),
                            Expanded(
                              child: sortedPlayers.isEmpty
                                  ? Center(
                                      child: CircularProgressIndicator(
                                        color: palette.primary,
                                      ),
                                    )
                                  : ListView.builder(
                                      itemCount: sortedPlayers.length,
                                      itemBuilder: (context, index) {
                                        final playerId =
                                            sortedPlayers[index].id;

                                        return PlayerStatistics(
                                          allPlayers: allPlayers,
                                          player: sortedPlayers[index],
                                          selectedAttribute: selectedAttribute,
                                          isCurrentPlayer:
                                              sortedPlayers[index].id ==
                                              currentPlayerId,
                                          isWinner: _postGameService.isWinner(
                                            playerId,
                                            allPlayers,
                                            _postGameService.isFlagMode(
                                              currentRoom,
                                            ),
                                          ),
                                          postGameAttributes:
                                              widget.postGameAttributes,
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
                _buildBottomContainer(palette),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBalanceVariation(ThemePalette palette) {
    final variationText = _cachedBalanceVariation != null
        ? "${'POST_GAME_LOBBY.REWARD'.tr()}: $_cachedBalanceVariation\$"
        : 'Calculating reward...';

    return GestureDetector(
      onTap: () => setState(() => showBalanceBreakdown = !showBalanceBreakdown),
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: Container(
          margin: EdgeInsets.only(left: 20, right: 20),
          padding: EdgeInsets.all(12),
          width: 312,
          decoration: BoxDecoration(
            color: showBalanceBreakdown
                ? palette.secondary
                : palette.secondaryDark,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            variationText,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: palette.mainTextColor,
              fontSize: 24,
              fontWeight: FontWeight.bold,
              fontFamily: 'Papyrus',
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGlobalStats(ThemePalette palette) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20),
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.secondaryDark,
        borderRadius: BorderRadius.circular(16),
      ),
      child: showBalanceBreakdown
          ? _buildBalanceBreakdown(palette)
          : Column(
              children: globalStats
                  .map((stat) => SingleGlobalStat(globalStat: stat))
                  .toList(),
            ),
    );
  }

  Widget _buildBalanceBreakdown(ThemePalette palette) {
    if (currentPlayerId == null || _cachedBalanceVariation == null) {
      return Text('Loading...', style: TextStyle(color: palette.mainTextColor));
    }

    final playerId = currentPlayerId!;
    final isFlagMode = _postGameService.isFlagMode(currentRoom);
    final isCurrentPlayerWinner = _postGameService.isWinner(
      playerId,
      allPlayers,
      isFlagMode,
    );
    final poolShare = _postGameService.calculatePoolShare(
      isCurrentPlayerWinner,
      currentRoom,
      allPlayers.length,
    );
    final challengePrize = _postGameService.getChallengePrize(
      playerId,
      allPlayers,
    );

    return Column(
      children: [
        _buildBreakdownRow(
          palette,
          'Base Prize:',
          '${isCurrentPlayerWinner ? 100 : 20}',
        ),
        _buildBreakdownRow(palette, 'Pool Share:', '$poolShare'),
        _buildBreakdownRow(palette, 'Challenge Reward:', '$challengePrize'),
        Divider(color: palette.primary, thickness: 2),
        _buildBreakdownRow(
          palette,
          'Total:',
          '$_cachedBalanceVariation',
          isTotal: true,
        ),
      ],
    );
  }

  Widget _buildBreakdownRow(
    ThemePalette palette,
    String label,
    String value, {
    bool isTotal = false,
  }) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            flex: 6,
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: palette.secondaryLight,
                fontSize: isTotal ? 16 : 14,
                fontFamily: 'Papyrus',
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Expanded(
            flex: 4,
            child: Text(
              value,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: palette.mainTextColor,
                fontSize: isTotal ? 20 : 18,
                fontWeight: FontWeight.bold,
                fontFamily: 'Papyrus',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttributesHeader() {
    final screenWidth = MediaQuery.of(context).size.width * 0.75;
    final decorationBarWidth = 4.8;
    final avatarWidth = 81.6;
    final avatarMargin = 20.0;
    final nameWidth = screenWidth * 0.25;
    final totalStatWidth =
        screenWidth -
        decorationBarWidth -
        avatarWidth -
        avatarMargin -
        nameWidth;
    final statWidth = totalStatWidth / widget.postGameAttributes.length;

    return Container(
      width: screenWidth,
      height: 80,
      child: Row(
        children: [
          SizedBox(width: decorationBarWidth),
          SizedBox(width: avatarWidth + avatarMargin),
          SizedBox(width: nameWidth),
          ...widget.postGameAttributes.map(
            (attr) => SizedBox(
              width: statWidth,
              child: attr.isGrouped
                  ? GroupedPostGameAttributeHeader(
                      attribute: attr,
                      sortOrders: sortOrders,
                      onSort: _handleSort,
                      onSelect: () =>
                          setState(() => selectedAttribute = attr.key),
                    )
                  : PostGameAttributeHeader(
                      attribute: attr,
                      sortOrder:
                          sortOrders[attr.key] ?? PostGameSortOrder.unsorted,
                      onSort: () => _handleSort(attr.key),
                      onSelect: () =>
                          setState(() => selectedAttribute = attr.key),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _handleSort(String attribute) {
    setState(() {
      final current = sortOrders[attribute] ?? PostGameSortOrder.unsorted;

      sortOrders.clear();

      switch (current) {
        case PostGameSortOrder.unsorted:
          sortOrders[attribute] = PostGameSortOrder.descending;
          sortedPlayers = _postGameService.sortPlayers(
            allPlayers,
            attribute,
            PostGameSortOrder.descending,
          );
          break;
        case PostGameSortOrder.descending:
          sortOrders[attribute] = PostGameSortOrder.ascending;
          sortedPlayers = _postGameService.sortPlayers(
            allPlayers,
            attribute,
            PostGameSortOrder.ascending,
          );
          break;
        case PostGameSortOrder.ascending:
          sortOrders[attribute] = PostGameSortOrder.unsorted;
          sortedPlayers = List.from(allPlayers);
          break;
      }
    });
  }

  Widget _buildBottomContainer(ThemePalette palette) {
    return Container(
      height: 80,
      alignment: Alignment.center,
      child: ElevatedButton(
        onPressed: () {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const MenuPage()),
          );
        },
        style:
            ElevatedButton.styleFrom(
              backgroundColor: palette.primary,
              foregroundColor: palette.invertedTextColor,
              padding: EdgeInsets.symmetric(horizontal: 60, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(48),
                side: BorderSide(color: palette.primary, width: 2),
              ),
              elevation: 4,
            ).copyWith(
              backgroundColor: WidgetStateProperty.resolveWith<Color>((
                Set<WidgetState> states,
              ) {
                if (states.contains(WidgetState.hovered)) {
                  return palette.primaryDark;
                }
                return palette.primary;
              }),
            ),
        child: Text(
          'FOOTER.QUIT'.tr(),
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            fontFamily: 'Papyrus',
            letterSpacing: 1.2,
          ),
        ),
      ),
    );
  }
}
