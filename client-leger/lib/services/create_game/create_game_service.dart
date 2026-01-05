import 'package:client_leger/services/challenge/challenge_service.dart';
import 'package:client_leger/services/join_game/join_game_service.dart'
    show Player;
import 'package:client_leger/services/socket/socket_service.dart';
import 'dart:async';

import 'package:client_leger/utils/constants/challenges/challenges-list.dart';

class CreateRoomResult {
  final String roomId;
  final List<Map<String, dynamic>> availableAvatars;
  CreateRoomResult({required this.roomId, required this.availableAvatars});
}

class CreateGameService {
  List<Map<String, dynamic>> _availableAvatars = const [];

  Future<void> connect() => SocketService.I.connect();

  Future<CreateRoomResult> createRoom(
    Map<String, dynamic> gamePayload, {
    String gameAvailability = 'public',
    int entryFee = 0,
    bool quickEliminationEnabled = false,
  }) async {
    await SocketService.I.connect();

    final c = Completer<CreateRoomResult>();

    SocketService.I.off('roomCreated');

    SocketService.I.once('roomCreated', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      final roomId = (map['roomId'] ?? '').toString();
      final avatars =
          (map['availableAvatars'] as List?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          <Map<String, dynamic>>[];
      _availableAvatars = avatars;
      c.complete(CreateRoomResult(roomId: roomId, availableAvatars: avatars));
    });

    SocketService.I.emit('createRoom', {
      'game': gamePayload,
      'gameAvailability': gameAvailability,
      'entryFee': entryFee,
      'quickEliminationEnabled': quickEliminationEnabled,
    });

    return c.future;
  }

  void selectCharacter(String avatarPathOrName) {
    final avatarObj = _buildAvatarObject(avatarPathOrName);
    SocketService.I.emit('selectCharacter', avatarObj);
  }

  void createPlayer(Player player, Map<String, dynamic> game) {
    final payload = _buildCreatePlayerPayload(player);
    SocketService.I.emit('createPlayer', payload);
  }

  Map<String, dynamic> _buildAvatarObject(String avatarPathOrName) {
    String name = avatarPathOrName;
    if (avatarPathOrName.contains('/')) {
      final last = avatarPathOrName.split('/').last;
      name = last.split('.').first;
    } else {
      // Strip extension if any
      final regex = RegExp(r'\.(png|jpg|jpeg|webp)$', caseSensitive: false);
      name = avatarPathOrName.replaceAll(regex, '');
    }
    final found = _availableAvatars.firstWhere(
      (a) => (a['name'] ?? '').toString().toLowerCase() == name.toLowerCase(),
      orElse: () => const {},
    );
    if (found.isNotEmpty) return found;
    return {'name': name};
  }

  Map<String, dynamic> _buildCreatePlayerPayload(Player p) {
    final stats = p.stats;
    final life = stats['life'] ?? 4;
    final speed = stats['speed'] ?? 4;
    final attack = stats['attack'] ?? 4;
    final defense = stats['defense'] ?? 4;

    return {
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
      'name': p.name,
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
      'assignedChallenge': ChallengesConstants().fakeChallenge,
    };
  }
}
