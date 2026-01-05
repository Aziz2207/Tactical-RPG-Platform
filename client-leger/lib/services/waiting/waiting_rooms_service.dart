import 'dart:async';

import 'package:client_leger/models/waiting_room.dart';
import 'package:client_leger/services/socket/socket_service.dart';

class WaitingRoomsService {
  final _roomsCtrl = StreamController<List<WaitingRoomInfo>>.broadcast();
  Stream<List<WaitingRoomInfo>> get rooms$ => _roomsCtrl.stream;
  bool _listening = false;

  Future<void> initialize() async {
    await SocketService.I.connect();
    if (_listening) return;
    _listening = true;
    SocketService.I.off('waitingRoomsUpdated');
    SocketService.I.on('waitingRoomsUpdated', (data) {
      try {
        final list = (data as List?) ?? const [];
        final parsed = list
            .whereType<Map>()
            .map((m) => WaitingRoomInfo.fromMap(Map<String, dynamic>.from(m)))
            .toList();
        _roomsCtrl.add(parsed);
      } catch (_) {
        _roomsCtrl.add(const []);
      }
    });
  }

  void request() {
    SocketService.I.emit('getWaitingRooms');
  }

  void dispose() {
    SocketService.I.off('waitingRoomsUpdated');
    _roomsCtrl.close();
    _listening = false;
  }
}
