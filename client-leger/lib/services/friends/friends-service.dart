import 'dart:async';

import 'package:client_leger/services/socket/socket_service.dart';

class FriendService {
  final socket = SocketService.I;
  static final Map<String, bool> onlineStatuses = {};
  static bool _presenceListenersBound = false;

  final StreamController<Map<String, dynamic>>
  _friendRequestReceivedController = StreamController.broadcast();

  Stream<Map<String, dynamic>> get friendRequestReceivedStream =>
      _friendRequestReceivedController.stream;

  unfriendPlayer(dynamic user) {}

  blockPlayer(bool isFriend, dynamic user) {}

  void sendFriendRequest(String receiverUid) {
    socket.emit("sendFriendRequest", {"receiverUid": receiverUid});
  }

  void acceptFriendRequest(String requesterUid) {
    // server expects payload key { requesterUid }
    socket.emit("acceptFriendRequest", {"requesterUid": requesterUid});
  }

  void rejectFriendRequest(String requesterUid) {
    // server expects payload key { requesterUid }
    socket.emit("rejectFriendRequest", {"requesterUid": requesterUid});
  }

  void onFriendRequestReceived() {
    socket.on("friendRequestReceived", (data) {
      // _friendRequestReceivedController.add(Map<String, dynamic>.from(data));

      // getFriendRequests();
    });
  }

  void getFriendRequests() {
    socket.emit("getFriendRequests");
  }

  void getFriends() {
    socket.emit("getFriends");
  }

  void getOnlineFriends() {
    socket.emit("getOnlineFriends");
  }

  void removeFriend(String friendUid) {
    socket.emit("removeFriend", {"friendUid": friendUid});
  }

  void blockUser(String blockedUid) {
    socket.emit("blockUser", {"blockedUid": blockedUid});
  }

  void unblockUser(String blockedUid) {
    socket.emit("unblockUser", {"blockedUid": blockedUid});
  }

  void getBlockedUsers() {
    socket.emit("getBlockedUsers");
  }

  void bindPresenceListeners() {
    if (_presenceListenersBound) return;
    _presenceListenersBound = true;

    socket.on('onlineFriends', (data) {
      try {
        final map = Map<String, dynamic>.from(data as Map);
        map.forEach((k, v) => onlineStatuses[k] = v == true);
      } catch (_) {
        // ignore
      }
    });

    socket.on('userConnected', (data) {
      final uid = _extractUid(data);
      if (uid != null && uid.isNotEmpty) {
        onlineStatuses[uid] = true;
      }
    });

    socket.on('userDisconnected', (data) {
      final uid = _extractUid(data);
      if (uid != null && uid.isNotEmpty) {
        onlineStatuses[uid] = false;
      }
    });
  }

  String? _extractUid(dynamic data) {
    try {
      if (data is Map) {
        final m = Map<String, dynamic>.from(data);
        final v = m['uid'];
        if (v is String) return v;
      }
      if (data is String) return data;
    } catch (_) {}
    return null;
  }
}
