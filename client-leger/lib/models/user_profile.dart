class UserProfile {
  final String uid;
  final String? email;
  final String? username;
  final String? avatarURL;

  const UserProfile({
    required this.uid,
    this.email,
    this.username,
    this.avatarURL,
  });

  factory UserProfile.fromMap(String uid, Map<String, dynamic>? data) {
    if (data == null) {
      return UserProfile(uid: uid);
    }
    return UserProfile(
      uid: uid,
      email: data['email'] as String?,
      username: data['username'] as String?,
      avatarURL: data['avatarURL'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {'email': email, 'username': username, 'avatarURL': avatarURL}
      ..removeWhere((key, value) => value == null);
  }
}
