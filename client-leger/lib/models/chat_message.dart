class ChatMessage {
  final String id;
  final String roomId;
  final String username;
  final String message;
  final DateTime timestamp;
  final String type;
  final String? avatarURL;

  const ChatMessage({
    required this.id,
    required this.roomId,
    required this.username,
    required this.message,
    required this.type,
    required this.timestamp,
    this.avatarURL,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
    id: (j['_id'] ?? '').toString(),
    roomId: (j['roomId'] ?? '').toString(),
    username: (j['username'] ?? '').toString(),
    message: (j['message'] ?? '').toString(),
    type: (j['type'] ?? 'global').toString(),
    timestamp: DateTime.parse(j['timestamp'] ?? "-"),
    avatarURL: j['avatarURL']?.toString(),
  );
}
