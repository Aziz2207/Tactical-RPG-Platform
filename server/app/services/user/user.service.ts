import { Injectable, Inject, Logger } from "@nestjs/common";
import * as admin from "firebase-admin";
import { UserAccount } from "@common/interfaces/user-account";
import { UserAccountValidator } from "@app/classes/user/user-account-validator/user-account-validator";
import {
  BACKGROUNDS_CATALOG,
  PURCHASABLE_AVATARS,
  THEMES_CATALOG,
} from "@app/constants";
import { Theme } from "@common/interfaces/theme";
import { FieldValue, WriteBatch } from "firebase-admin/firestore";
import { MapDocument } from "@app/model/schema/map.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
@Injectable()
export class UserService {
  activeUsers: Set<string> = new Set();
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject("FIREBASE_ADMIN") private readonly firebaseAdmin: typeof admin,
    @InjectModel(Map.name) private mapModel: Model<MapDocument>
  ) {}

  addActiveUser(uid: string) {
    return this.activeUsers.add(uid);
  }

  removeActiveUser(uid: string) {
    return this.activeUsers.delete(uid);
  }

  hasUserSignedIn(uid: string) {
    return this.activeUsers.has(uid);
  }

  async deleteUserAccount(uid: string): Promise<boolean> {
    let userData,
      userStats = null;
    const batch = this.firebaseAdmin.firestore().batch();
    try {
      const userDocRef = this.firebaseAdmin
        .firestore()
        .collection("users")
        .doc(uid);
      const userStatsDocRef = this.firebaseAdmin
        .firestore()
        .collection("statistics")
        .doc(uid);
      const userSnapshot = await userDocRef.get();
      const userStatsSnapshot = await userStatsDocRef.get();

      userData = userSnapshot.exists ? userSnapshot.data() : null;
      userStats = userStatsSnapshot.exists ? userStatsSnapshot.data() : null;
      batch.delete(userDocRef);
      batch.delete(userStatsDocRef);
      await this.deleteLinks(uid, batch);
      await this.firebaseAdmin.auth().deleteUser(uid);
      await batch.commit();
      await this.mapModel.deleteMany({ creatorId: uid });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async deleteLinks(
    uidToDelete: string,
    batch: WriteBatch = this.firebaseAdmin.firestore().batch()
  ): Promise<void> {
    if (!uidToDelete) return;

    // 1) Read the target user doc to get the lists of impacted uids
    const user = await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uidToDelete)
      .get();
    if (user.exists) return;
    const data = user.data() || {};

    const friends: string[] = Array.isArray(data.friends) ? data.friends : [];
    const friendRequests: string[] = Array.isArray(data.friendRequests)
      ? data.friendRequests
      : [];
    const sentFriendRequests: string[] = Array.isArray(data.sentFriendRequests)
      ? data.sentFriendRequests
      : [];
    const blockers: string[] = Array.isArray(data.blockers)
      ? data.blockers
      : [];

    // 2) Build unique impacted UIDs (exclude the uidToDelete itself)
    const impactedUids = Array.from(
      new Set([
        ...friends,
        ...friendRequests,
        ...sentFriendRequests,
        ...blockers,
      ])
    );
    if (impactedUids.length === 0) return;

    for (const impactedUid of impactedUids) {
      try {
        // If your documents use uid as a field:
        const qs = await this.firebaseAdmin
          .firestore()
          .collection("users")
          .doc(impactedUid)
          .get();
        if (!qs.exists) continue;

        // Update the single document to remove the target uid from arrays
        await batch.update(qs.ref, {
          friends: FieldValue.arrayRemove(uidToDelete),
          friendRequests: FieldValue.arrayRemove(uidToDelete),
          sentFriendRequests: FieldValue.arrayRemove(uidToDelete),
          blockers: FieldValue.arrayRemove(uidToDelete),
          blockedUsers: FieldValue.arrayRemove(uidToDelete),
        });

        // console.log(`Updated user ${impactedUid} (doc ${qs.ref.id})`);
      } catch (err) {
        console.error(`Failed to update impacted uid ${impactedUid}:`, err);
        // continue to next impactedUid; optionally collect failures for retry
        throw err;
      }
    }

    console.log(`Finished removing references to ${uidToDelete}`);
  }

  async signUserOut(uid: string) {
    await this.firebaseAdmin.auth().revokeRefreshTokens(uid);
  }
  async verifyUser(token: string) {
    return await this.firebaseAdmin.auth().verifyIdToken(token);
  }

  async getUserAccount(uid: string){
    const docSnapshot = await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    return docSnapshot.data();
  }

  async createNewUserAccount(user: Partial<UserAccount>) {
    const { username, email, password, avatarURL } =
      await UserAccountValidator.validateAccount(this.firebaseAdmin, user);
    const firebaseUser = await this.firebaseAdmin.auth().createUser({
      email,
      password,
      displayName: username,
    });

    try {
      const createdAt = FieldValue.serverTimestamp();
      const userDocument: Partial<UserAccount> = {
        username,
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? email,
        password,
        avatarURL: avatarURL ?? null,
        createdAt: createdAt as any,
        balance: 30,
        lifetimeEarnings: 0,
        selectedLanguage: "fr",
        ownedBackgrounds: ["./assets/images/backgrounds/title_page_bgd16.jpg"],
        selectedBackground: "./assets/images/backgrounds/title_page_bgd16.jpg",
        ownedThemes: [Theme.Gold, Theme.Blue],
        selectedTheme: Theme.Gold,
      };
      await this.firebaseAdmin
        .firestore()
        .collection("users")
        .doc(firebaseUser.uid)
        .set(userDocument);
      await this.firebaseAdmin
        .firestore()
        .collection("statistics")
        .doc(firebaseUser.uid)
        .set({
          uid: firebaseUser.uid,
          numOfPartiesWon: 0,
          numOfCTFPartiesPlayed: 0,
          numOfClassicPartiesPlayed: 0,
          challengesCompleted: 0,
          gameDurationsForPlayer: [],
        });
      const token = await this.firebaseAdmin
        .auth()
        .createCustomToken(firebaseUser.uid);
      return {
        user: userDocument,
        token,
      };
    } catch (error) {
      await this.deleteAuthUser(firebaseUser.uid);
      console.error(
        "createNewUserAccount failed, rolled back auth user",
        error
      );
      throw new Error("User creation failed. Auth user reverted.");
    }
  }

  private async deleteAuthUser(uid: string) {
    try {
      await this.firebaseAdmin.auth().deleteUser(uid);
    } catch (err) {
      console.error(
        "Rollback: suppression de l'utilisateur Auth impossible",
        err
      );
    }
  }

  async modifyUserAccount(uid: string, data: Partial<UserAccount>): Promise<string> {
    const user = await this.getUserAccount(uid);
    const email = UserAccountValidator.validateEmail(data.email);
    const username = UserAccountValidator.validateUsername(data.username);

    if (
      user.email !== email &&
      (await UserAccountValidator.emailExists(this.firebaseAdmin, email))
    ) {
      throw new Error("Adresse courriel déjà associée à un compte");
    }

    if (
      user.username !== username &&
      (await UserAccountValidator.usernameExists(this.firebaseAdmin, username))
    ) {
      throw new Error("Pseudonyme existe déjà");
    }
     let mayBeToken = null;
    if (user.email !== email){
      await this.firebaseAdmin.auth().updateUser(uid, {
        email: email,
      });
    
        mayBeToken = await this.firebaseAdmin.auth().createCustomToken(uid);}
    if (user.username !== username) {
      await this.firebaseAdmin.auth().updateUser(uid, {
        displayName: username,
      });
    }
      await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .update(data);
    return mayBeToken;
  }

  async sendFriendRequest(
    senderUid: string,
    receiverUid: string
  ): Promise<void> {
    if (senderUid === receiverUid) {
      throw new Error("Cannot send friend request to yourself");
    }

    const batch = this.firebaseAdmin.firestore().batch();

    const senderRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(senderUid);
    const receiverRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(receiverUid);

    const [senderDoc, receiverDoc] = await Promise.all([
      senderRef.get(),
      receiverRef.get(),
    ]);

    if (!senderDoc.exists) {
      throw new Error("Sender not found");
    }
    if (!receiverDoc.exists) {
      throw new Error("Receiver not found");
    }

    const senderData = senderDoc.data();
    const receiverData = receiverDoc.data();

    if (senderData.friends?.includes(receiverUid)) {
      throw new Error("Users are already friends");
    }

    if (receiverData.blockedUsers?.includes(senderUid)) {
      throw new Error("Cannot send friend request to this user");
    }

    if (senderData.blockedUsers?.includes(receiverUid)) {
      throw new Error("Cannot send friend request to blocked user");
    }

    if (receiverData.friendRequests?.includes(senderUid)) {
      throw new Error("Friend request already sent");
    }

    if (senderData.friendRequests?.includes(receiverUid)) {
      throw new Error("This user has already sent you a friend request");
    }

    batch.update(receiverRef, {
      friendRequests: admin.firestore.FieldValue.arrayUnion(senderUid),
    });

    batch.update(senderRef, {
      sentFriendRequests: admin.firestore.FieldValue.arrayUnion(receiverUid),
    });

    await batch.commit();
  }

  async acceptFriendRequest(
    userUid: string,
    requesterUid: string
  ): Promise<void> {
    const batch = this.firebaseAdmin.firestore().batch();

    const userRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(userUid);
    const requesterRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(requesterUid);

    const [userDoc, requesterDoc] = await Promise.all([
      userRef.get(),
      requesterRef.get(),
    ]);

    if (!userDoc.exists || !requesterDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const requesterData = requesterDoc.data();

    if (!userData.friendRequests?.includes(requesterUid)) {
      throw new Error("Friend request not found");
    }

    batch.update(userRef, {
      friends: admin.firestore.FieldValue.arrayUnion(requesterUid),
      friendRequests: admin.firestore.FieldValue.arrayRemove(requesterUid),
    });

    batch.update(requesterRef, {
      friends: admin.firestore.FieldValue.arrayUnion(userUid),
      sentFriendRequests: admin.firestore.FieldValue.arrayRemove(userUid),
    });

    await batch.commit();
  }

  async rejectFriendRequest(
    userUid: string,
    requesterUid: string
  ): Promise<void> {
    const batch = this.firebaseAdmin.firestore().batch();

    const userRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(userUid);
    const requesterRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(requesterUid);

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    if (!userData.friendRequests?.includes(requesterUid)) {
      throw new Error("Friend request not found");
    }

    batch.update(userRef, {
      friendRequests: admin.firestore.FieldValue.arrayRemove(requesterUid),
    });

    batch.update(requesterRef, {
      sentFriendRequests: admin.firestore.FieldValue.arrayRemove(userUid),
    });

    await batch.commit();
  }

  async getFriendRequests(uid: string): Promise<UserAccount[]> {
    const userDoc = await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const friendRequestIds = userData.friendRequests || [];

    if (friendRequestIds.length === 0) {
      return [];
    }

    const friendRequestPromises = friendRequestIds.map(
      async (requesterId: string) => {
        const requesterDoc = await this.firebaseAdmin
          .firestore()
          .collection("users")
          .doc(requesterId)
          .get();

        if (requesterDoc.exists) {
          return {
            uid: requesterId,
            ...requesterDoc.data(),
          } as UserAccount;
        }
        return null;
      }
    );

    const friendRequests = await Promise.all(friendRequestPromises);
    return friendRequests.filter((request) => request !== null);
  }

  async getFriends(uid: string): Promise<UserAccount[]> {
    const userDoc = await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const friendIds = userData.friends || [];

    if (friendIds.length === 0) {
      return [];
    }

    const friendPromises = friendIds.map(async (friendId: string) => {
      const friendDoc = await this.firebaseAdmin
        .firestore()
        .collection("users")
        .doc(friendId)
        .get();

      if (friendDoc.exists) {
        return {
          uid: friendId,
          ...friendDoc.data(),
        } as UserAccount;
      }
      return null;
    });

    const friends = await Promise.all(friendPromises);
    return friends.filter((friend) => friend !== null);
  }

  async removeFriend(userUid: string, friendUid: string): Promise<void> {
    const batch = this.firebaseAdmin.firestore().batch();

    const userRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(userUid);
    const friendRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(friendUid);

    const [userDoc, friendDoc] = await Promise.all([
      userRef.get(),
      friendRef.get(),
    ]);

    if (!userDoc.exists || !friendDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    if (!userData.friends?.includes(friendUid)) {
      throw new Error("Users are not friends");
    }

    batch.update(userRef, {
      friends: admin.firestore.FieldValue.arrayRemove(friendUid),
    });

    batch.update(friendRef, {
      friends: admin.firestore.FieldValue.arrayRemove(userUid),
    });

    await batch.commit();
  }

  async searchUsersByUsername(query: string): Promise<UserAccount[]> {
    try {
      const snapshot = await this.firebaseAdmin
        .firestore()
        .collection("users")
        .where("username", ">=", query.toLowerCase())
        .where("username", "<=", query.toLowerCase() + "\uf8ff")
        .get();

      if (snapshot.empty) {
        return [];
      }

      const users = snapshot.docs.map(
        (doc) =>
          ({
            uid: doc.id,
            ...doc.data(),
          }) as UserAccount
      );

      return users;
    } catch (error) {
      console.error("Error searching users:", error);
      throw new Error("Failed to search users");
    }
  }

  async updateUserBalance(uid: string, amount: number, addToLifetimeEarnings: boolean): Promise<number> {
    const userRef = this.firebaseAdmin.firestore().collection("users").doc(uid);

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const currentBalance = userData?.balance || 0;
    const lifetimeEarnings = userData?.lifetimeEarnings || 0;

    // Compute the difference
    const diff = amount - currentBalance;

    const updates: Record<string, number> = {
      balance: amount,
    };

    if (diff > 0 && addToLifetimeEarnings) {
      updates.lifetimeEarnings = lifetimeEarnings + diff;
    }

    await userRef.update(updates);

    return amount;
  }



  async getOwnedBackgrounds(uid: string): Promise<string[]> {
    return this.getOwnedItems(uid, "ownedBackgrounds");
  }

  async getSelectedBackground(uid: string): Promise<string> {
    const userData = await this.getUserData(uid);
    return (
      userData?.selectedBackground ||
      "./assets/images/backgrounds/title_page_bgd17.jpg"
    );
  }

  async selectBackground(uid: string, backgroundURL: string): Promise<void> {
    await this.selectItem(
      uid,
      backgroundURL,
      "ownedBackgrounds",
      "selectedBackground",
      "arrière-plan"
    );
  }

  async purchaseBackground(
    uid: string,
    backgroundURL: string,
    price: number
  ): Promise<{ newBalance: number; ownedBackgrounds: string[] }> {
    return this.purchaseItem(
      uid,
      backgroundURL,
      price,
      "ownedBackgrounds",
      "arrière-plan"
    );
  }

  async getAvailableBackgrounds(
    uid: string
  ): Promise<
    Array<{ url: string; price: number; title: string; owned: boolean }>
  > {
    const ownedItems = await this.getOwnedBackgrounds(uid);
    return BACKGROUNDS_CATALOG.map((bg) => ({
      ...bg,
      owned: ownedItems.includes(bg.url),
    }));
  }

  // ========== AVATAR METHODS ==========

  async getOwnedAvatars(uid: string): Promise<string[]> {
    return this.getOwnedItems(uid, "ownedPurchasableAvatars");
  }

  async purchaseAvatar(
    uid: string,
    avatarURL: string,
    price: number
  ): Promise<{ newBalance: number; ownedPurchasableAvatars: string[] }> {
    return this.purchaseItem(
      uid,
      avatarURL,
      price,
      "ownedPurchasableAvatars",
      "avatar"
    );
  }

  async getAvailableAvatars(
    uid: string
  ): Promise<
    Array<{ src: string; price: number; title: string; owned: boolean }>
  > {
    const ownedItems = await this.getOwnedAvatars(uid);
    return PURCHASABLE_AVATARS.map((avatar) => ({
      ...avatar,
      owned: ownedItems.includes(avatar.src),
    }));
  }

  // ========== THEME METHODS ==========

  async getOwnedThemes(uid: string): Promise<string[]> {
    const userData = await this.getUserData(uid);
    return userData?.ownedThemes || [Theme.Gold];
  }

  async getSelectedTheme(uid: string): Promise<string> {
    const userData = await this.getUserData(uid);
    return userData?.selectedTheme || Theme.Gold;
  }

  async selectTheme(uid: string, theme: string): Promise<void> {
    const userData = await this.getUserData(uid);
    const ownedThemes = userData?.ownedThemes || [Theme.Gold];

    if (!ownedThemes.includes(theme)) {
      throw new Error("Vous ne possédez pas ce thème");
    }

    await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({ selectedTheme: theme });
  }

  async purchaseTheme(
    uid: string,
    theme: string,
    price: number
  ): Promise<{ newBalance: number; ownedThemes: string[] }> {
    return this.purchaseItem(uid, theme, price, "ownedThemes", "thème", [
      Theme.Gold,
    ]);
  }

  async getAvailableThemes(uid: string): Promise<
    Array<{
      id: number;
      value: string;
      price: number;
      label: string;
      owned: boolean;
      colorClass: string;
    }>
  > {
    const ownedThemes = await this.getOwnedThemes(uid);
    return THEMES_CATALOG.map((t) => ({
      ...t,
      owned: ownedThemes.includes(t.value),
    }));
  }

  // ========== BALANCE METHODS ==========

  async getBalance(uid: string): Promise<number> {
    const userData = await this.getUserData(uid);
    return userData?.balance || 0;
  }

  async adjustBalance(uid: string, amount: number): Promise<number> {
    const userRef = this.firebaseAdmin.firestore().collection("users").doc(uid);

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const currentBalance = userData?.balance || 0;
    const newBalance = currentBalance + amount;

    await userRef.update({ balance: newBalance });

    this.logger.log(
      `User balance adjusted by ${amount}. New balance: ${newBalance}`
    );

    return newBalance;
  }

  // ========== HELPER METHODS ==========

  private async getUserData(uid: string): Promise<any> {
    const userDoc = await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new Error("Utilisateur non trouvé");
    }

    return userDoc.data();
  }

  private async getOwnedItems(uid: string, field: string): Promise<string[]> {
    const userData = await this.getUserData(uid);
    return userData?.[field] || [];
  }

  private async selectItem(
    uid: string,
    itemURL: string,
    ownedField: string,
    selectedField: string,
    itemType: string
  ): Promise<void> {
    const userData = await this.getUserData(uid);
    const ownedItems = userData?.[ownedField] || [];

    if (!ownedItems.includes(itemURL)) {
      throw new Error(`Vous ne possédez pas cet ${itemType}`);
    }

    await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({ [selectedField]: itemURL });
  }

  private async purchaseItem(
    uid: string,
    itemIdentifier: string,
    price: number,
    ownedField: string,
    itemType: string,
    defaultOwned: string[] = []
  ): Promise<any> {
    const userDocRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid);

    return this.firebaseAdmin
      .firestore()
      .runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists) {
          throw new Error("Utilisateur non trouvé");
        }

        const userData = userDoc.data();
        const currentBalance = userData?.balance || 0;
        const ownedItems = userData?.[ownedField] || defaultOwned;

        if (ownedItems.includes(itemIdentifier)) {
          throw new Error(`Vous possédez déjà cet ${itemType}`);
        }

        if (currentBalance < price) {
          throw new Error("Solde insuffisant");
        }

        const newBalance = currentBalance - price;
        const updatedOwnedItems = [...ownedItems, itemIdentifier];

        transaction.update(userDocRef, {
          balance: newBalance,
          [ownedField]: updatedOwnedItems,
        });

        return {
          newBalance,
          [ownedField]: updatedOwnedItems,
        };
      });
  }

  async getSelectedLanguage(uid: string): Promise<string> {
    const userData = await this.getUserData(uid);
    return userData?.selectedLanguage || "en";
  }

  async setSelectedLanguage(uid: string, language: string): Promise<void> {
    await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({ selectedLanguage: language });

    this.logger.log(`User ${uid} language set to ${language}`);
  }

  async blockUser(blockerUid: string, blockedUid: string): Promise<void> {
    if (blockerUid === blockedUid) {
      throw new Error("Cannot block yourself");
    }

    const batch = this.firebaseAdmin.firestore().batch();

    const blockerRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(blockerUid);
    const blockedRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(blockedUid);

    const [blockerDoc, blockedDoc] = await Promise.all([
      blockerRef.get(),
      blockedRef.get(),
    ]);

    if (!blockerDoc.exists) {
      throw new Error("Blocker not found");
    }
    if (!blockedDoc.exists) {
      throw new Error("Blocked user not found");
    }

    const blockerData = blockerDoc.data();

    if (blockerData.blockedUsers?.includes(blockedUid)) {
      throw new Error("User is already blocked");
    }

    batch.update(blockerRef, {
      blockedUsers: admin.firestore.FieldValue.arrayUnion(blockedUid),
    });

    batch.update(blockedRef, {
      blockers: admin.firestore.FieldValue.arrayUnion(blockerUid),
    });

    if (blockerData.friendRequests?.includes(blockedUid)) {
      batch.update(blockerRef, {
        friendRequests: admin.firestore.FieldValue.arrayRemove(blockedUid),
      });
      batch.update(blockedRef, {
        sentFriendRequests: admin.firestore.FieldValue.arrayRemove(blockerUid),
      });
    }

    if (blockerData.sentFriendRequests?.includes(blockedUid)) {
      batch.update(blockerRef, {
        sentFriendRequests: admin.firestore.FieldValue.arrayRemove(blockedUid),
      });
      batch.update(blockedRef, {
        friendRequests: admin.firestore.FieldValue.arrayRemove(blockerUid),
      });
    }

    await batch.commit();
  }

  async unblockUser(blockerUid: string, blockedUid: string): Promise<void> {
    const blockerRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(blockerUid);
    const blockedRef = this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(blockedUid);
    const blockerDoc = await blockerRef.get();

    if (!blockerDoc.exists) {
      throw new Error("User not found");
    }

    const blockerData = blockerDoc.data();

    if (!blockerData.blockedUsers?.includes(blockedUid)) {
      throw new Error("User is not blocked");
    }

    await blockerRef.update({
      blockedUsers: admin.firestore.FieldValue.arrayRemove(blockedUid),
    });

    await blockedRef.update({
      blockers: admin.firestore.FieldValue.arrayRemove(blockerUid),
    });
  }

  async getBlockedUsers(uid: string): Promise<UserAccount[]> {
    const userDoc = await this.firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const blockedUserIds = userData.blockedUsers || [];

    if (blockedUserIds.length === 0) {
      return [];
    }

    const blockedUserPromises = blockedUserIds.map(
      async (blockedId: string) => {
        const blockedDoc = await this.firebaseAdmin
          .firestore()
          .collection("users")
          .doc(blockedId)
          .get();

        if (blockedDoc.exists) {
          return {
            uid: blockedId,
            ...blockedDoc.data(),
          } as UserAccount;
        }
        return null;
      }
    );

    const blockedUsers = await Promise.all(blockedUserPromises);
    return blockedUsers.filter((user) => user !== null);
  }

  async getVisibleUsers(requestingUid: string): Promise<UserAccount[]> {
    try {
      const snapshot = await this.firebaseAdmin
        .firestore()
        .collection("users")
        .get();

      if (snapshot.empty) {
        return [];
      }

      let users = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...(doc.data() as UserAccount),
      }));

      if (requestingUid) {
        const requestingUserDoc = await this.firebaseAdmin
          .firestore()
          .collection("users")
          .doc(requestingUid)
          .get();

        const requestingUserData = requestingUserDoc.data();
        const blockedByRequester = requestingUserData?.blockedUsers || [];

        users = users.filter((user) => {
          if (user.uid === requestingUid) {
            return false;
          }

          if (blockedByRequester.includes(user.uid)) {
            return false;
          }

          if (user.blockedUsers?.includes(requestingUid)) {
            return false;
          }

          return true;
        });
      }

      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error("Failed to fetch users from Firestore");
    }
  }

  async getEveryUser(): Promise<UserAccount[]> {
    try {
      const snapshot = await this.firebaseAdmin
        .firestore()
        .collection("users")
        .get();

      if (snapshot.empty) {
        return [];
      }

      let users = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...(doc.data() as UserAccount),
      }));

      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error("Failed to fetch users from Firestore");
    }
  }
  
  getOnlineStatus(uids: string[]): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const id of uids) {
      result[id] = this.activeUsers.has(id);
    }
    return result;
  }
}
