import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:client_leger/models/user_profile.dart';
import 'package:client_leger/utils/images/background_manager.dart';
import 'dart:async';

import 'package:flutter/material.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // État courant de l’utilisateur (écoutable par l’UI)
  final ValueNotifier<User?> currentUser = ValueNotifier<User?>(null);
  late final StreamSubscription<User?> _sub;

  AuthService() {
    currentUser.value = _auth.currentUser;
    _sub = _auth.authStateChanges().listen((u) => currentUser.value = u);
  }

  Future<bool> isUserConnected() async => currentUser.value != null;

  // Récupère l'ID token Firebase pour l’Authorization Bearer (vers le serveur)
  Future<String?> getToken({bool forceRefresh = true}) async {
    final u = _auth.currentUser;
    if (u == null) throw Exception('Utilisateur non authentifié');
    return await u.getIdToken(forceRefresh);
  }

  // Connexion via email/password Firebase
  Future<User?> signInWithEmailAndPassword(
    String username,
    String password,
  ) async {
    try {
      if (_auth.currentUser != null) {
        await signOut();
      }

      // 2. Récupérer le document utilisateur correspondant au username
      final query = await _db
          .collection('users')
          .where('username', isEqualTo: username)
          .limit(1)
          .get();

      if (query.docs.isEmpty) {
        throw FirebaseAuthException(
          code: 'username-not-found',
          message: "Nom d'utilisateur introuvable.",
        );
      }

      final userDoc = query.docs.first.data();
      final email = userDoc['email'] as String?;

      if (email == null || email.isEmpty) {
        throw FirebaseAuthException(
          code: 'missing-email',
          message: "Adresse e-mail manquante pour cet utilisateur.",
        );
      }

      UserCredential result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      currentUser.value = result.user;

      // Apply user-selected menu background if available
      final selectedBg = userDoc['selectedBackground'] as String?;
      if (selectedBg != null && selectedBg.trim().isNotEmpty) {
        AppMenuBackground.setByFilename(selectedBg);
      } else {
        AppMenuBackground.resetToDefault();
      }

      return result.user;
    } on FirebaseAuthException catch (e) {
      print("Erreur FirebaseAuth login: ${e.code} - ${e.message}");
      rethrow;
    } catch (e) {
      print("Erreur login inattendue: $e");
      rethrow;
    }
  }

  // Connexion via custom token
  Future<User?> signInWithCustomToken(String token) async {
    try {
      UserCredential result = await _auth.signInWithCustomToken(token);
      // After custom-token sign-in, fetch the current user's profile to apply background
      try {
        final ref = _currentUserDocRef;
        if (ref != null) {
          final doc = await ref.get();
          final data = doc.data();
          final selectedBg = data?['selectedBackground'] as String?;
          if (selectedBg != null && selectedBg.trim().isNotEmpty) {
            AppMenuBackground.setByFilename(selectedBg);
          } else {
            AppMenuBackground.resetToDefault();
          }
        }
      } catch (_) {
        // ignore background preference errors; keep default
      }
      return result.user;
    } catch (e) {
      print("Erreur custom token: $e");
      return null;
    }
  }

  // Déconnexion
  Future<void> signOut() async {
    try {
      await _auth.signOut();
      currentUser.value = null;
    } catch (e) {
      print("Erreur signOut: $e");
    }
  }

  // check if pseudonym is already taken
  Future<bool> isPseudonymTaken(String pseudonym) async {
    final query = await _db
        .collection('users')
        .where('username', isEqualTo: pseudonym)
        .limit(1)
        .get();
    return query.docs.isNotEmpty;
  }

  // --- User profile getters (centralized) ---
  String? get currentUserId => _auth.currentUser?.uid;

  DocumentReference<Map<String, dynamic>>? get _currentUserDocRef {
    final uid = currentUserId;
    if (uid == null) return null;
    return _db.collection('users').doc(uid);
  }

  // Stream of the current user's profile document as a strongly-typed model
  Stream<UserProfile?> currentUserProfileStream() {
    final ref = _currentUserDocRef;
    if (ref == null) return const Stream<UserProfile?>.empty();
    return ref.snapshots().map(
      (snap) => UserProfile.fromMap(ref.id, snap.data()),
    );
  }

  // One-shot fetch of the current user's profile
  Future<UserProfile?> getCurrentUserProfile() async {
    final ref = _currentUserDocRef;
    if (ref == null) return null;
    final doc = await ref.get();
    return UserProfile.fromMap(ref.id, doc.data());
  }

  // Convenience helpers
  Stream<String?> currentUsernameStream() =>
      currentUserProfileStream().map((p) => p?.username);

  Stream<String?> currentAvatarURLStream() =>
      currentUserProfileStream().map((p) => p?.avatarURL);

  void dispose() {
    _sub.cancel();
  }
}
