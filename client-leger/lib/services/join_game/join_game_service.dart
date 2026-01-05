import 'package:client_leger/services/challenge/challenge_service.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:client_leger/utils/constants/challenges/challenges-list.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class Room {
  final String roomId;
  final List<dynamic> availableAvatars;
  final int entryFee;

  Room({
    required this.roomId,
    required this.availableAvatars,
    required this.entryFee,
  });

  factory Room.fromJson(Map<String, dynamic> j) {
    final dynamic feeRaw = j['entryFee'];
    int fee = 0;
    if (feeRaw is num) {
      fee = feeRaw.toInt();
    } else if (feeRaw != null) {
      fee = int.tryParse(feeRaw.toString()) ?? 0;
    }
    return Room(
      roomId: j['roomId']?.toString() ?? '',
      availableAvatars: (j['availableAvatars'] as List?) ?? const [],
      entryFee: fee,
    );
  }
}

class Player {
  final String name;
  final String avatar;
  final Map<String, int> stats;
  Player({required this.name, required this.avatar, required this.stats});
  Map<String, dynamic> toJson() => {
    'name': name,
    'avatar': avatar,
    'stats': stats,
  };
}

class JoinGameService {
  final _errors = <String, String>{
    'invalidFormat': 'JOIN_PAGE.ERRORS.INVALID_FORMAT'.tr(),
    'roomNotFound': 'JOIN_PAGE.ERRORS.ROOM_NOT_FOUND'.tr(),
    'roomLocked': 'JOIN_PAGE.ERRORS.ROOM_LOCKED'.tr(),
    'friendsOnlyAccess': 'JOIN_PAGE.ERRORS.FRIENDS_ONLY_ACCESS'.tr(),
    'hasBlockedUsersInRoom': 'JOIN_PAGE.ERRORS.HAS_BLOCKED_USERS_IN_ROOM'.tr(),
    'blockedByUserInRoom': 'JOIN_PAGE.ERRORS.BLOCKED_BY_USER_IN_ROOM'.tr(),
    'insufficientFunds': 'JOIN_PAGE.ERRORS.INSUFFICIENT_FUNDS'.tr(),
  };

  // Cache avatars from server to build valid payloads
  List<Map<String, dynamic>> _availableAvatars = const [];

  void connect() => SocketService.I.connect();

  String? validateCode(String code) {
    final trimmed = code.trim();
    return RegExp(r'^\d{4}$').hasMatch(trimmed)
        ? null
        : _errors['invalidFormat'];
  }

  void handleJoinGame(
    BuildContext context,
    String accessCode,
    void Function(Room? room, String message) callback,
  ) {
    final err = validateCode(accessCode.trim());
    if (err != null) {
      callback(null, err);
      return;
    }

    SocketService.I.off('joinedRoom');
    SocketService.I.off('joinError');

    SocketService.I.once('joinedRoom', (data) {
      final room = Room.fromJson(Map<String, dynamic>.from(data as Map));
      _availableAvatars = List<Map<String, dynamic>>.from(
        room.availableAvatars.map((e) => Map<String, dynamic>.from(e as Map)),
      );
      callback(room, '');
    });

    SocketService.I.once('joinError', (res) {
      final key = (res is String) ? res : res.toString();
      callback(null, _errors[key] ?? key);
    });

    SocketService.I.emit('joinRoom', accessCode);
  }

  void selectCharacter(String avatar) {
    final avatarObj = _buildAvatarObject(avatar);
    SocketService.I.emit('selectCharacter', avatarObj);
  }

  void joinLobby(
    BuildContext context, {
    required String roomId,
    required Player player,
    required VoidCallback onNavigateToLobby,
  }) {
    SocketService.I.emit('isLocked', roomId);
    SocketService.I.off('isRoomLocked');
    SocketService.I.once('isRoomLocked', (locked) {
      final isLocked = locked == true;
      if (isLocked) {
        _handleLockedRoom(context, roomId);
      } else {
        final payload = _buildCreatePlayerPayload(player);
        SocketService.I.emit('createPlayer', payload);
        onNavigateToLobby();
      }
    });
  }

  void leaveRoom(String roomId) {
    SocketService.I.emit('leaveRoom', roomId);
  }

  void _handleLockedRoom(BuildContext context, String roomId) async {
    final navigator = Navigator.of(context);
    final action = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: Text('DIALOG.TITLE.ADD_BOT_WHEN_LOCKED').tr(),
        content: const Text(
          'Veuillez réessayer plus tard ou retourner au menu principal ',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, 'stay'),
            child: const Text('DIALOG.STAY').tr(),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'leave'),
            child: const Text('DIALOG.QUIT').tr(),
          ),
        ],
      ),
    );

    if (action == 'leave') {
      leaveRoom(roomId);
      navigator.popUntil((r) => r.isFirst);
    }
  }

  Map<String, dynamic> _buildCreatePlayerPayload(Player p) {
    final name = p.name;
    final stats = p.stats;
    final life = stats['life'] ?? 4;
    final speed = stats['speed'] ?? 4;
    final attack = stats['attack'] ?? 4;
    final defense = stats['defense'] ?? 4;

    return {
      // id will be assigned by server
      'attributes': {
        'initialHp': life,
        'initialSpeed': speed,
        'initialAttack': 4,
        'initialDefense': 4,
        'totalHp': life,
        'currentHp': life,
        'speed': speed,
        'movementPointsLeft': speed,
        'maxActionPoints': 1,
        'actionPoints': 1,
        'attack': 4,
        'atkDiceMax': attack,
        'defense': 4,
        'defDiceMax': defense,
        'evasion': 2,
      },
      'avatar': _buildAvatarObject(p.avatar),
      'isActive': false,
      'name': name,
      'status': 'regular-player',
      'postGameStats': {
        'combats': 0,
        'victories': 0,
        'draws': 0,
        'evasions': 0,
        'defeats': 0,
        'damageDealt': 0,
        'damageTaken': 0,
        'itemsObtained': 0,
        'tilesVisited': 0,
      },
      'inventory': <dynamic>[],
      'position': {'x': -1, 'y': -1},
      'positionHistory': <dynamic>[],
      'spawnPosition': {'x': -1, 'y': -1},
      'behavior': 'sentient',
      'collectedItems': <dynamic>[],
      'assignedChallenge': ChallengesConstants().fakeChallenge,
    };
  }

  Map<String, dynamic> _buildAvatarObject(String avatarPathOrName) {
    final name = _avatarNameFromPath(avatarPathOrName);
    final found = _availableAvatars.firstWhere(
      (a) => (a['name'] ?? '').toString().toLowerCase() == name.toLowerCase(),
      orElse: () => const {},
    );
    if (found.isNotEmpty) return found;
    return {'name': name};
  }

  String _avatarNameFromPath(String pathOrName) {
    if (!pathOrName.contains('/')) {
      final regex = RegExp(r'\.(png|jpg|jpeg|webp)$', caseSensitive: false);
      return pathOrName.replaceAll(regex, '');
    }
    final last = pathOrName.split('/').last;
    return last.split('.').first;
  }
}
