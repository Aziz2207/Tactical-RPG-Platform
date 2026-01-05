import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/models/global_stat.dart';
import 'package:client_leger/services/challenge/challenge_service.dart';

enum PostGameSortOrder { unsorted, ascending, descending }

class PostGameService {
  static final PostGameService _instance = PostGameService._internal();
  factory PostGameService() => _instance;
  PostGameService._internal();

  static PostGameService get I => _instance;

  // Calculate total terrain tiles from game map
  int calculateTotalTerrainTiles(Map<String, dynamic>? currentRoom) {
    if (currentRoom == null) return 0;

    try {
      final gameMap = currentRoom["gameMap"];
      if (gameMap == null || gameMap is! Map) return 0;

      final tiles = gameMap["tiles"];
      if (tiles == null || tiles is! List) return 0;

      return _findTotalTerrainTiles(tiles);
    } catch (e) {
      print('ERROR computing total terrain tiles: $e');
      return 0;
    }
  }

  // Calculate total doors from game map
  int calculateTotalDoors(Map<String, dynamic>? currentRoom) {
    if (currentRoom == null) return 0;

    try {
      final gameMap = currentRoom["gameMap"];
      if (gameMap == null || gameMap is! Map) return 0;

      final tiles = gameMap["tiles"];
      if (tiles == null || tiles is! List) return 0;

      return _findTotalDoors(tiles);
    } catch (e) {
      print('ERROR computing total doors: $e');
      return 0;
    }
  }

  // Check if game mode is Capture the Flag
  bool isFlagMode(Map<String, dynamic>? currentRoom) {
    if (currentRoom == null) return false;

    try {
      final gameMap = currentRoom["gameMap"];
      if (gameMap != null && gameMap is Map) {
        final mode = gameMap["mode"];
        return mode == "GAME.MODE.CTF";
      }
    } catch (e) {
      print('Error checking flag mode: $e');
    }

    return false;
  }

  // Calculate number of flag bearers
  int calculateFlagBearers(List<Player> allPlayers) {
    int nbFlagBearers = 0;

    for (var player in allPlayers) {
      if (player.collectedItems != null) {
        final flagCount = player.collectedItems!.where((itemId) {
          return itemId.toString().toLowerCase() == 'flag' ||
              itemId.toString() == '21';
        }).length;

        nbFlagBearers += flagCount;
      }
    }

    return nbFlagBearers;
  }

  // Check if player is winner
  bool isWinner(String playerId, List<Player> allPlayers, bool isFlagMode) {
    try {
      final player = allPlayers.firstWhere(
        (player) => player.id == playerId,
        orElse: () => throw Exception('Player not found'),
      );

      if (isFlagMode) {
        return player.inventory.any((item) => item["id"] == 21);
      }
      return player.postGameStats.victories == 3;
    } catch (e) {
      print('Error in isWinner for id $playerId: $e');
      return false;
    }
  }

  // Get challenge prize for player
  int getChallengePrize(String playerId, List<Player> allPlayers) {
    try {
      final player = allPlayers.firstWhere(
        (player) => player.id == playerId,
        orElse: () => throw Exception('Player not found'),
      );
      return ChallengeService.isChallengeSuccess(player)
          ? (player.assignedChallenge?.reward ?? 0)
          : 0;
    } catch (e) {
      print('Error in getChallengePrize for id $playerId: $e');
      return 0;
    }
  }

  // Calculate pool share for winner/loser
  int calculatePoolShare(
    bool isWinner,
    Map<String, dynamic>? currentRoom,
    int nbPlayers,
  ) {
    final entryFee = currentRoom?["entryFee"] ?? 0;
    final totalPrizePool = entryFee * nbPlayers;

    if (totalPrizePool <= 0) return 0;

    if (isWinner) {
      return (totalPrizePool * 2 ~/ 3);
    }

    final nbLosers = nbPlayers - 1;
    return nbLosers > 0 ? (totalPrizePool ~/ 3 ~/ nbLosers) : 0;
  }

  // Compute balance variation for player
  int? computeBalanceVariation(
    String? currentPlayerId,
    List<Player> allPlayers,
    Map<String, dynamic>? currentRoom,
    bool isFlagMode,
  ) {
    if (currentPlayerId == null || allPlayers.isEmpty) return null;

    try {
      final isCurrentPlayerWinner = isWinner(
        currentPlayerId,
        allPlayers,
        isFlagMode,
      );
      final basePrize = isCurrentPlayerWinner ? 100 : 20;
      final poolShare = calculatePoolShare(
        isCurrentPlayerWinner,
        currentRoom,
        allPlayers.length,
      );
      final challengePrize = getChallengePrize(currentPlayerId, allPlayers);

      return basePrize + poolShare + challengePrize;
    } catch (e) {
      print('Error computing balance variation: $e');
      return null;
    }
  }

  // Compute global statistics from room data
  Map<String, dynamic> computeGlobalStats(
    Map<String, dynamic>? currentRoom,
    int totalTerrainTiles,
    int totalDoors,
    List<Player> allPlayers,
  ) {
    if (currentRoom == null) {
      return _getDefaultGlobalStats();
    }

    final globalPostGameStats = currentRoom["globalPostGameStats"];
    if (globalPostGameStats == null || globalPostGameStats is! Map) {
      return _getDefaultGlobalStats();
    }

    final gameDuration = globalPostGameStats["gameDuration"] ?? "00:00";
    final turns = globalPostGameStats["turns"] ?? 0;

    // Calculate global tiles visited percentage
    double globalTilesVisitedPercentage = 0.0;
    final globalTilesVisited = globalPostGameStats["globalTilesVisited"];
    if (globalTilesVisited != null && globalTilesVisited is List) {
      final uniqueTiles = <String>{};
      for (var pos in globalTilesVisited) {
        if (pos is Map) {
          final x = pos['x'];
          final y = pos['y'];
          if (x != null && y != null) {
            uniqueTiles.add('$x,$y');
          }
        }
      }

      globalTilesVisitedPercentage = calculateInteractionPercentage(
        uniqueTiles.length,
        totalTerrainTiles,
      );
    }

    // Calculate doors interacted percentage
    String doorsInteractedPercentage = "0%";
    final doorsInteracted = globalPostGameStats["doorsInteracted"];
    if (doorsInteracted != null && doorsInteracted is List) {
      final uniqueDoors = <String>{};
      for (var pos in doorsInteracted) {
        if (pos is Map) {
          final x = pos['x'];
          final y = pos['y'];
          if (x != null && y != null) {
            uniqueDoors.add('$x,$y');
          }
        }
      }

      final percentage = calculateInteractionPercentage(
        uniqueDoors.length,
        totalDoors,
      );
      if (percentage == -1.0) {
        doorsInteractedPercentage = "NA";
      } else {
        doorsInteractedPercentage = "${percentage.toStringAsFixed(2)}%";
      }
    }

    final isFlagModeActive = isFlagMode(currentRoom);
    final nbFlagBearers = isFlagModeActive
        ? calculateFlagBearers(allPlayers)
        : 0;

    return {
      'gameDuration': gameDuration,
      'turns': turns,
      'globalTilesVisitedPercentage': globalTilesVisitedPercentage,
      'doorsInteractedPercentage': doorsInteractedPercentage,
      'nbFlagBearers': nbFlagBearers,
      'isFlagMode': isFlagModeActive,
    };
  }

  // Build global stats list
  List<GlobalStat> buildGlobalStatsList(Map<String, dynamic> statsData) {
    final stats = [
      GlobalStat(
        id: 'game-duration',
        key: 'gameDuration',
        displayText: 'POST_GAME_LOBBY.STATS.GAME_LENGTH',
        value: statsData['gameDuration'],
      ),
      GlobalStat(
        id: 'turns',
        key: 'turns',
        displayText: 'POST_GAME_LOBBY.STATS.TURNS',
        value: statsData['turns'],
      ),
      GlobalStat(
        id: 'global-tiles-visited',
        key: 'globalTilesVisited',
        displayText: 'POST_GAME_LOBBY.STATS.GLOBAL_TILES_VISITED',
        value: statsData['globalTilesVisitedPercentage'] >= 0
            ? '${statsData['globalTilesVisitedPercentage'].toStringAsFixed(2)}%'
            : 'NA',
      ),
      GlobalStat(
        id: 'doors-interacted',
        key: 'doorsInteracted',
        displayText: 'POST_GAME_LOBBY.STATS.PCT_DOORS_INTEREACTED',
        value: statsData['doorsInteractedPercentage'],
      ),
    ];

    if (statsData['isFlagMode'] == true) {
      stats.add(
        GlobalStat(
          id: 'flag-bearers',
          key: 'nbFlagBearers',
          displayText: 'POST_GAME_LOBBY.STATS.NB_FLAG_BEARERS',
          value: statsData['nbFlagBearers'],
        ),
      );
    }

    return stats;
  }

  // Calculate player statistics
  void calculatePlayerStats(
    List<Player> allPlayers,
    int totalTerrainTiles,
  ) {
    _calculateUniqueItems(allPlayers);
    _calculateTilesVisitedPercentage(allPlayers, totalTerrainTiles);
  }

  // Sort players by attribute
  List<Player> sortPlayers(
    List<Player> allPlayers,
    String attribute,
    PostGameSortOrder order,
  ) {
    final sortedPlayers = List<Player>.from(allPlayers);

    sortedPlayers.sort((a, b) {
      if (a.postGameStats == null || b.postGameStats == null) return 0;

      var aValue = a.postGameStats[attribute];
      var bValue = b.postGameStats[attribute];

      if (aValue is String && bValue is String) {
        if (attribute == 'combatRecord') {
          var aWins = int.tryParse(aValue.split('/')[0]) ?? 0;
          var bWins = int.tryParse(bValue.split('/')[0]) ?? 0;
          return order == PostGameSortOrder.ascending
              ? aWins.compareTo(bWins)
              : bWins.compareTo(aWins);
        }
        return order == PostGameSortOrder.ascending
            ? aValue.compareTo(bValue)
            : bValue.compareTo(aValue);
      }

      var aNum = (aValue is num) ? aValue : 0;
      var bNum = (bValue is num) ? bValue : 0;

      return order == PostGameSortOrder.ascending
          ? aNum.compareTo(bNum)
          : bNum.compareTo(aNum);
    });

    return sortedPlayers;
  }

  // Calculate interaction percentage
  double calculateInteractionPercentage(int elementCount, int maxElement) {
    if (maxElement == 0) return -1.0;
    const totalPercentage = 100.0;
    return double.parse(
      ((elementCount / maxElement) * totalPercentage).toStringAsFixed(2),
    );
  }

  // Private helper methods

  Map<String, dynamic> _getDefaultGlobalStats() {
    return {
      'gameDuration': "00:00",
      'turns': 0,
      'globalTilesVisitedPercentage': 0.0,
      'doorsInteractedPercentage': "0%",
      'nbFlagBearers': 0,
      'isFlagMode': false,
    };
  }

  int _countTiles(bool Function(int) condition, List<dynamic> grid) {
    int count = 0;
    for (var row in grid) {
      if (row is List) {
        for (var tile in row) {
          if (tile is int && condition(tile)) {
            count++;
          }
        }
      }
    }
    return count;
  }

  int _findTotalTerrainTiles(List<dynamic> grid) {
    const wallTileType = 4;
    return _countTiles((tile) => tile < wallTileType, grid);
  }

  int _findTotalDoors(List<dynamic> grid) {
    const doorTileType = 5;
    return _countTiles((tile) => tile >= doorTileType, grid);
  }

  void _calculateUniqueItems(List<Player> allPlayers) {
    for (var player in allPlayers) {
      if (player.collectedItems != null && player.postGameStats != null) {
        player.postGameStats['itemsObtained'] = player.collectedItems!.length;
      }
    }
  }

  void _calculateTilesVisitedPercentage(
    List<Player> allPlayers,
    int totalTerrainTiles,
  ) {
    if (totalTerrainTiles == 0) return;

    for (var player in allPlayers) {
      final historyLength = player.positionHistory.length;

      if (player.postGameStats != null) {
        final percentage = calculateInteractionPercentage(
          historyLength,
          totalTerrainTiles,
        );
        player.postGameStats['tilesVisited'] = percentage;
      }
    }
  }
}