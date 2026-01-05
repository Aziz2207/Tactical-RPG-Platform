import { Injectable, signal } from "@angular/core";
import {
  Auth,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  getIdToken,
} from "@angular/fire/auth";
import { browserSessionPersistence, setPersistence } from "@firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  Firestore,
} from "@angular/fire/firestore";

@Injectable({ providedIn: "root" })
export class FireAuthService {
  currentUserSignal = signal<User | null>(null);

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSignal.set(user);
    });
  }

  async isUserConnected() {
    return this.currentUserSignal() !== null;
  }
  async getToken() {
    const user = this.currentUserSignal();
    if (user) {
      const token = await getIdToken(user, true);
      return token;
    }
    throw new Error("Utilisateur non authentifié");
  }

  async signInWithEmailAndPassword(email: string, password: string) {
    if (this.currentUserSignal()) {
      this.signOut();
    }
    await setPersistence(this.auth, browserSessionPersistence);
    return firebaseSignInWithEmailAndPassword(this.auth, email, password);
  }

  async signInWithUsernameAndPassword(username: string, password: string) {
    if (this.currentUserSignal()) {
      this.signOut();
    }
    const userRef = collection(this.firestore, "users");
    const q = query(userRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Nom d'utilisateur introuvable.");
    }

    const userDoc = querySnapshot.docs[0];
    const email = userDoc.data()["email"];

    if (!email) {
      throw new Error("Adresse e-mail manquante pour cet utilisateur.");
    }
    await setPersistence(this.auth, browserSessionPersistence);
    return firebaseSignInWithEmailAndPassword(this.auth, email, password);
  }

  async signInWithCustomToken(token: string) {
    await setPersistence(this.auth, browserSessionPersistence);
    return firebaseSignInWithCustomToken(this.auth, token);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }
}
