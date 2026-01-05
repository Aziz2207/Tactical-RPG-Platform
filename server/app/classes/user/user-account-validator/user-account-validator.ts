import * as admin from "firebase-admin";

export class UserAccountValidator {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static validateEmail(email: string): string {
    const e = this.sanitizeRemoveAllSpaces(email);
    if (!e) throw new Error("Adresse e-mail requise");
    if (!this.EMAIL_REGEX.test(e)) throw new Error("Adresse e-mail invalide");
    return e;
  }

  static validateUsername(username: string): string {
    if (!username) throw new Error("Pseudonyme requis");
    const clean = this.sanitizeRemoveAllSpaces(username);
    if (!clean) throw new Error("Pseudonyme requis");
    if (clean.length < 3 || clean.length > 20)
      throw new Error("Pseudonyme doit contenir entre 3 et 20 caractères");
    return clean;
  }

  static validatePassword(password: string): string {
    if (!password) throw new Error("Mot de passe requis");
    const clean = this.sanitizeRemoveAllSpaces(password);
    if (!clean) throw new Error("Mot de passe requis");
    if (clean.length < 8 || clean.length > 20)
      throw new Error("Le mot de passe doit contenir entre 8 et 20 caractères");
    return clean;
  }

  static async usernameExists(
    firebaseAdmin: typeof admin,
    username: string
  ): Promise<boolean> {
    const snapshot = await firebaseAdmin
      .firestore()
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  static async emailExists(
    firebaseAdmin: typeof admin,
    email: string
  ): Promise<boolean> {
    const snapshot = await firebaseAdmin
      .firestore()
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  static async validateAccount(
    firebaseAdmin: typeof import("firebase-admin"),
    input: Partial<{
      username: string;
      email: string;
      password: string;
      avatarURL: string;
    }>
  ): Promise<{
    username: string;
    email: string;
    password: string;
    avatarURL: string;
  }> {
    const email = this.validateEmail(input.email);
    const username = this.validateUsername(input.username);
    const password = this.validatePassword(input.password);
    const avatarURL = input.avatarURL;

    if (await this.emailExists(firebaseAdmin, email)) {
      throw new Error("Adresse courriel déjà associée à un compte");
    }

    if (await this.usernameExists(firebaseAdmin, username)) {
      throw new Error("Pseudonyme existe déjà");
    }
    return {
      username,
      email,
      password,
      avatarURL: avatarURL,
    };
  }

  private static sanitizeRemoveAllSpaces(value: string): string {
    return value.replace(" ", "");
  }
}
