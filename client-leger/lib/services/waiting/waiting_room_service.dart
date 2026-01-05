import 'dart:async';

import 'package:client_leger/models/lobby_player.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:rxdart/subjects.dart';

/// Encapsulates waiting room socket wiring and exposes state as streams.
class WaitingRoomService {
  WaitingRoomService(this.roomCode);

  final String roomCode;

  // Internal state
  List<LobbyPlayer> _players = const [];
  bool _isAdmin = false;
  bool _isLocked =
      false; // effective lock shown in UI (server lock OR full room)
  bool _serverIsLocked = false; // raw lock state from server
  String _mapName = '';
  String _mode = '';
  String _availability = '';
  bool _hasLeftRoom = false;
  bool _joined = false; // prevent duplicate joins per connection
  bool _connectHandlerBound = false; // prevent stacking connect handlers
  int _maxPlayers =
      0; // room capacity derived from gameMap.nbPlayers when available
  bool _wasFull = false; // track previous full state to detect transitions
  int _entryFee = 0; // entry fee for the room (0 if free)

  // Streams
  final _playersCtrl = StreamController<List<LobbyPlayer>>.broadcast();
  final _isAdminCtrl = StreamController<bool>.broadcast();
  final _isLockedCtrl = StreamController<bool>.broadcast();
  final _mapNameCtrl = StreamController<String>.broadcast();
  final _modeCtrl = StreamController<String>.broadcast();
  final _availabilityCtrl = StreamController<String>.broadcast();
  final _startGameCtrl = StreamController<Map<String, dynamic>?>.broadcast();
  final _kickedCtrl = StreamController<void>.broadcast();
  final _roomDeletedCtrl = StreamController<String?>.broadcast();
  final _entryFeeCtrl = StreamController<int>.broadcast();
  final dropInEnabledController = BehaviorSubject<bool>();
  final BehaviorSubject<bool> quickElimination$ = BehaviorSubject.seeded(false);

  Stream<List<LobbyPlayer>> get players$ => _playersCtrl.stream;
  Stream<bool> get isAdmin$ => _isAdminCtrl.stream;
  Stream<bool> get isLocked$ => _isLockedCtrl.stream;
  Stream<String> get mapName$ => _mapNameCtrl.stream;
  Stream<String> get mode$ => _modeCtrl.stream;
  Stream<String> get availability$ => _availabilityCtrl.stream;
  Stream<Map<String, dynamic>?> get startGame$ => _startGameCtrl.stream;
  Stream<void> get kicked$ => _kickedCtrl.stream;
  Stream<String?> get roomDeleted$ => _roomDeletedCtrl.stream;
  Stream<int> get entryFee$ => _entryFeeCtrl.stream;
  Stream<bool> get dropInEnabled$ => dropInEnabledController.stream;

  // Listener keys to cleanly unsubscribe
  static const _evUpdatedPlayer = 'updatedPlayer';
  static const _evIsPlayerAdmin = 'isPlayerAdmin';
  static const _evIsRoomLocked = 'isRoomLocked';
  static const _evStartGame = 'startGame';
  static const _evJoinedRoom = 'joinedRoom';
  static const _evObtainRoomInfo = 'obtainRoomInfo';
  static const _evKickPlayer = 'kickPlayer';
  static const _evRoomDeleted = 'roomDeleted';
  static const _evDropInEnabledUpdated = 'DropInEnableUpdated';
  static const _evChangeDropInEnabled = 'ChangeDropInEnabled';
  void initialize() async {
    // Ensure connection and wait for it to complete to avoid racing emits
    await SocketService.I.connect();

    // Bind a single connect handler that re-joins on reconnects
    if (!_connectHandlerBound) {
      SocketService.I.on('connect', (_) {
        // On reconnection, membership is lost; allow re-join
        _joined = false;
        // Only re-join if user had joined previously
        if (!_hasLeftRoom && _joined) {
          SocketService.I.emit('joinRoom', roomCode);
        }
      });
      _connectHandlerBound = true;
    }

    // NOTE: Do not auto-join here. Call join() explicitly after the user
    // validates the room code and navigates to the waiting room.

    SocketService.I.off(_evUpdatedPlayer);
    SocketService.I.off(_evIsPlayerAdmin);
    SocketService.I.off(_evIsRoomLocked);
    SocketService.I.off(_evStartGame);
    SocketService.I.off(_evObtainRoomInfo);
    SocketService.I.off(_evKickPlayer);
    SocketService.I.off(_evRoomDeleted);
    SocketService.I.off(_evJoinedRoom);

    // Wire listeners
    SocketService.I.on(_evUpdatedPlayer, (data) {
      final room = Map<String, dynamic>.from(data as Map);
      _updateFromRoom(room);
    });

    SocketService.I.on(_evIsPlayerAdmin, (isAdmin) {
      _isAdmin = isAdmin == true;
      _isAdminCtrl.add(_isAdmin);
    });

    SocketService.I.on(_evIsRoomLocked, (locked) {
      _serverIsLocked = locked == true;
      _applyEffectiveLock();
    });

    SocketService.I.on(_evDropInEnabledUpdated, (value) {
      if (value == null) {
        dropInEnabledController.add(false);
        return;
      }
      dropInEnabledController.add(value);
    });

    SocketService.I.on(_evStartGame, (data) {
      Map<String, dynamic>? room;
      if (data is Map) {
        room = Map<String, dynamic>.from(data);
        _trySetMapNameFromRoom(room);
      }
      _startGameCtrl.add(room);
    });

    SocketService.I.on(_evKickPlayer, (_) {
      if (!_hasLeftRoom) {
        leaveRoom();
      }
      _kickedCtrl.add(null);
    });

    SocketService.I.on(_evRoomDeleted, (msg) {
      if (!_hasLeftRoom) {
        leaveRoom();
      }
      _roomDeletedCtrl.add(msg is String ? msg : null);
    });

    // Joined room map name priming, then request fresh room info
    SocketService.I.once(_evJoinedRoom, (data) {
      if (data is Map) {
        _trySetMapNameFromRoom(Map<String, dynamic>.from(data));
      }
      // Ask the server for full room info once membership is confirmed
      requestRoomInfo();
    });
    // If the server doesn't emit joinedRoom (edge case), we still have an
    // initial room info request below after a short delay; omitted here for simplicity
  }

  // Explicit join API to be called after room code validation.
  void join() {
    if (_hasLeftRoom) return;
    if (_joined) return; // de-dupe initial join
    SocketService.I.emit('joinRoom', roomCode);
    _joined = true;
  }

  void requestRoomInfo() {
    SocketService.I.off(_evObtainRoomInfo);
    SocketService.I.once(_evObtainRoomInfo, (data) {
      final room = Map<String, dynamic>.from(data as Map);
      final q = room['quickEliminationEnabled'] == true;
      quickElimination$.add(q);
      if (room.containsKey('dropInEnabled')) {
        final raw = room['dropInEnabled'];
        final bool newValue = raw;
        dropInEnabledController.add(newValue);
      }

      _updateFromRoom(room);
    });
    // Server derives room from socket membership; no payload needed
    SocketService.I.emit('GetRoom');
  }

  void seedInitialInfo({String? mapName, String? mode, String? availability}) {
    if (mapName != null && mapName.isNotEmpty && mapName != _mapName) {
      _mapName = mapName;
      _mapNameCtrl.add(_mapName);
    }
    if (mode != null && mode.isNotEmpty && mode != _mode) {
      _mode = mode;
      _modeCtrl.add(_mode);
    }
    if (availability != null &&
        availability.isNotEmpty &&
        availability != _availability) {
      _availability = availability;
      _availabilityCtrl.add(_availability);
    }
  }

  bool changeLock(bool value) {
    if (!value && _isLobbyFull()) {
      return false;
    }
    // Update server lock request and recompute effective lock after
    SocketService.I.emit('changeLockRoom', value);
    _serverIsLocked = value;
    _applyEffectiveLock();
    return true;
  }

  void startGame() {
    SocketService.I.emit('startGame');
  }

  void createBot(String behavior) {
    SocketService.I.emit('createBot', behavior);
  }

  void kick(String playerId, {required bool isBot}) {
    if (isBot) {
      SocketService.I.emit('kickBot', playerId);
    } else {
      SocketService.I.emit('kickPlayer', playerId);
    }
  }

  void leaveRoom() {
    if (_hasLeftRoom) return;
    SocketService.I.emit('leaveRoom', roomCode);
    _hasLeftRoom = true;
    _joined = false;
  }

  void dispose() {
    // Remove the reconnect handler to avoid stacking across lifecycles
    if (_connectHandlerBound) {
      SocketService.I.off('connect');
      _connectHandlerBound = false;
    }

    _hasLeftRoom = true;
    _joined = false;

    SocketService.I.off(_evUpdatedPlayer);
    SocketService.I.off(_evIsPlayerAdmin);
    SocketService.I.off(_evIsRoomLocked);
    SocketService.I.off(_evStartGame);
    SocketService.I.off(_evObtainRoomInfo);
    SocketService.I.off(_evKickPlayer);
    SocketService.I.off(_evRoomDeleted);
    SocketService.I.off(_evJoinedRoom);
    SocketService.I.off(_evDropInEnabledUpdated);
    // SocketService.I.off(_evMapInformation);
    // Close streams
    _playersCtrl.close();
    _isAdminCtrl.close();
    _isLockedCtrl.close();
    _mapNameCtrl.close();
    _modeCtrl.close();
    dropInEnabledController.close();
    _availabilityCtrl.close();
    _startGameCtrl.close();
    _kickedCtrl.close();
    _roomDeletedCtrl.close();
    _entryFeeCtrl.close();
    // _mapInformationCtrl.close();
  }

  void _updateFromRoom(Map<String, dynamic> room) {
    _trySetMapNameFromRoom(room);
    _updateMaxPlayersFromRoom(room);
    _updateEntryFeeFromRoom(room);
    final players = LobbyPlayer.fromRoom(room);
    _players = players;
    _playersCtrl.add(_players);
    _applyEffectiveLock();
    final q = room['quickEliminationEnabled'] == true;
    quickElimination$.add(q);
    if (room.containsKey('dropInEnabled')) {
      final raw = room['dropInEnabled'];
      final bool newValue = raw;
      dropInEnabledController.add(newValue);
    }
    final isNowFull = _isLobbyFull();
    if (!_wasFull && isNowFull) {
      SocketService.I.emit('changeLockRoom', true);
      _serverIsLocked = true;
      _applyEffectiveLock();
    } else if (_wasFull && !isNowFull) {
      SocketService.I.emit('changeLockRoom', false);
      _serverIsLocked = false;
      _applyEffectiveLock();
    }
    _wasFull = isNowFull;
  }

  void _trySetMapNameFromRoom(Map<String, dynamic> room) {
    String mapName = '';
    String mode = '';
    String availability = '';
    final gm = room['gameMap'];
    if (gm is Map) {
      mapName = (gm['name'] ?? gm['mapName'] ?? '').toString();
      mode = (gm['mode'] ?? '').toString();
    } else if (gm is String) {
      mapName = gm;
    }
    if (mapName.isEmpty && room['name'] is String) {
      mapName = room['name'] as String;
    }
    final av = room['gameAvailability'];
    if (av is String) {
      availability = av;
    }
    if (mapName.isNotEmpty && mapName != _mapName) {
      _mapName = mapName;
      _mapNameCtrl.add(_mapName);
    }
    if (mode.isNotEmpty && mode != _mode) {
      _mode = mode;
      _modeCtrl.add(_mode);
    }
    if (availability.isNotEmpty && availability != _availability) {
      _availability = availability;
      _availabilityCtrl.add(_availability);
    }
  }

  void _updateEntryFeeFromRoom(Map<String, dynamic> room) {
    final raw = room['entryFee'];
    int fee = 0;
    if (raw is num) {
      fee = raw.toInt();
    } else if (raw is String) {
      fee = int.tryParse(raw) ?? 0;
    }
    if (fee != _entryFee) {
      _entryFee = fee;
      _entryFeeCtrl.add(_entryFee);
    }
  }

  void _updateMaxPlayersFromRoom(Map<String, dynamic> room) {
    final gm = room['gameMap'];
    int? nb;
    if (gm is Map) {
      final raw = gm['nbPlayers'];
      if (raw is int) nb = raw;
      if (raw is num) nb = raw.toInt();
    }
    if (nb != null && nb > 0 && nb != _maxPlayers) {
      _maxPlayers = nb;
    }
  }

  bool _isLobbyFull() {
    if (_maxPlayers <= 0) return false;
    return _players.length >= _maxPlayers;
  }

  bool get isLobbyFull => _isLobbyFull();

  void _applyEffectiveLock() {
    final effective = _serverIsLocked || _isLobbyFull();
    if (effective != _isLocked) {
      _isLocked = effective;
      _isLockedCtrl.add(_isLocked);
    }
  }

  void changeDropIn(bool enabled) {
    SocketService.I.emit(_evChangeDropInEnabled, enabled);
  }
}
