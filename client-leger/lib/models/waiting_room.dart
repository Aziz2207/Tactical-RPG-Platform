class WaitingRoomInfo {
  WaitingRoomInfo({
    required this.roomId,
    required this.gameName,
    required this.gameImage,
    required this.gameMode,
    required this.gameDimension,
    required this.playerCount,
    required this.maxPlayers,
    required this.gameAvailability,
    required this.entryFee,
    required this.dropInEnabled,
    required this.quickEliminationEnabled,
    required this.adminId,
    required this.gameStatus,
  });

  final String roomId;
  final String gameName;
  final String gameImage;
  final String gameMode;
  final int gameDimension;
  final int playerCount;
  final int maxPlayers;
  final String gameAvailability;
  final int entryFee;
  final bool dropInEnabled;
  final bool quickEliminationEnabled;
  final String adminId;
  final String gameStatus;

  factory WaitingRoomInfo.fromMap(Map<String, dynamic> m) {
    String s(dynamic v) => v?.toString() ?? '';
    int i(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
    bool b(dynamic v) =>
        v == true || (v is String && v.toLowerCase() == 'true');
    return WaitingRoomInfo(
      roomId: s(m['roomId']),
      gameName: s(m['gameName']),
      gameImage: s(m['gameImage']),
      gameMode: s(m['gameMode']),
      gameDimension: i(m['gameDimension']),
      playerCount: i(m['playerCount']),
      maxPlayers: i(m['maxPlayers']),
      gameAvailability: s(m['gameAvailability']),
      entryFee: i(m['entryFee']),
      dropInEnabled: b(m['dropInEnabled']),
      quickEliminationEnabled: b(m['quickEliminationEnabled']),
      adminId: s(m['adminId']),
      gameStatus: s(m['gameStatus']),
    );
  }
}
