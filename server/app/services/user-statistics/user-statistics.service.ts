import { MILLISECONDS_IN_SECOND } from "@app/constants";
import { GameMode } from "@common/constants";
import { PlayerRecord } from "@common/interfaces/player";
import { Injectable, Inject, Logger } from "@nestjs/common";
import * as admin from "firebase-admin";

@Injectable()
export class UserStatisticsService {
  activeUsers: Set<string> = new Set();

  constructor(
    @Inject("FIREBASE_ADMIN") private readonly firebaseAdmin: typeof admin,
    private logger: Logger
  ) {}

  async getUserStatistics(uid: string) {
    if (!uid) return {};
    const docSnapshot = await this.firebaseAdmin
      .firestore()
      .collection("statistics")
      .doc(uid)
      .get();

    if (!docSnapshot.exists) {
      await this.createUserStatistics(uid);
      const newDocSnapshot = await this.firebaseAdmin
        .firestore()
        .collection("statistics")
        .doc(uid)
        .get();
      return newDocSnapshot.data();
    }

    return docSnapshot.data();
  }

  async getAllUsersStatistics() {
    const snapshot = await this.firebaseAdmin
      .firestore()
      .collection("statistics")
      .get();

    return snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
  }

  async updatePlayersStatsAfterGame(
    playersRecords: Map<string, PlayerRecord>,
    winnerUserid: string,
    mode: string
  ) {
    this.logger.debug("Update Players Stats After Game");
      const userIds = Array.from(playersRecords.keys());
    try {
      await this.ensureUserStatisticsExist(userIds);
      await this.batchUpdatePlayerStatistics(
        playersRecords,
        winnerUserid,
        mode
      );
      this.logger.debug(
        `Successfully updated statistics for ${userIds.length} players`
      );
    } catch (error) {
      console.error(`Failed for UIDs ${userIds}:`, error);
      throw error;
    }
  }
  private async incrementStat(uid: string, fieldToUpdate: string) {
    if (!uid || uid.trim() === '') {
      console.warn(`Skipping increment for ${fieldToUpdate}: Invalid or empty UID`);
      return;
    }
    
    try {
      const docRef = this.firebaseAdmin
        .firestore()
        .collection("statistics")
        .doc(uid);

      await docRef.set(
        {
          [fieldToUpdate]: this.firebaseAdmin.firestore.FieldValue.increment(1),
        },
        { merge: true }
      );

      console.log(`Incremented ${fieldToUpdate} for UID: ${uid}`);
    } catch (error) {
      console.error(
        `Failed to increment ${fieldToUpdate} for UID ${uid}:`,
        error
      );
      throw error;
    }
  }

  private async batchUpdatePlayerStatistics(
    playersRecords: Map<string, PlayerRecord>,
    winnerUserid: string,
    mode: string
  ): Promise<void> {
    const batch = this.firebaseAdmin.firestore().batch();
    const isClassic = mode === GameMode.Classic;
    const fieldToUpdate = isClassic
      ? "numOfClassicPartiesPlayed"
      : "numOfCTFPartiesPlayed";

    for (const [uid, playerRecord] of playersRecords.entries()) {
      const docRef = this.firebaseAdmin
        .firestore()
        .collection("statistics")
        .doc(uid);

      const gameDuration = this.calculatePlayerGameDuration(playerRecord);
      const isWinner = uid === winnerUserid;

      const updates: any = {
        [fieldToUpdate]: this.firebaseAdmin.firestore.FieldValue.increment(1),
        gameDurationsForPlayer:
          this.firebaseAdmin.firestore.FieldValue.arrayUnion(gameDuration),
      };

      if (isWinner) {
        updates.numOfPartiesWon =
          this.firebaseAdmin.firestore.FieldValue.increment(1);
      }

      batch.update(docRef, updates);
    }

    await batch.commit();
  }

  private calculatePlayerGameDuration(playerRecord: PlayerRecord): number {
    const dropIns = playerRecord.dropIns;
    const dropOuts = playerRecord.dropOuts;
    const n = Math.min(dropIns.length, dropOuts.length);
    return (
      Array.from({ length: n }, (_, i) => dropOuts[i] - dropIns[i]).reduce(
        (acc, v) => acc + v,
        0
      ) / MILLISECONDS_IN_SECOND
    );
  }

  private async ensureUserStatisticsExist(uids: string[]): Promise<void> {
    const checks = await Promise.all(
      uids.map((uid) =>
        this.firebaseAdmin.firestore().collection("statistics").doc(uid).get()
      )
    );

    const missingUids = uids.filter((_, index) => !checks[index].exists);

    if (missingUids.length > 0) {
      await Promise.all(
        missingUids.map((uid) => this.createUserStatistics(uid))
      );
      this.logger.debug(
        `Created statistics for ${missingUids.length} new users`
      );
    }
  }

  async incrementChallengesCompleted(uid: string) {
    await this.incrementStat(uid, "challengesCompleted");
  }

  private async createUserStatistics(uid: string) {
    const initialStats = {
      numOfPartiesWon: 0,
      numOfClassicPartiesPlayed: 0,
      numOfCTFPartiesPlayed: 0,
      gameDurationsForPlayer: [],
      challengesCompleted: 0,
    };

    try {
      await this.firebaseAdmin
        .firestore()
        .collection("statistics")
        .doc(uid)
        .set(initialStats, { merge: true }); // Use merge to avoid overwriting if created concurrently

      this.logger.debug(`Created statistics for UID: ${uid}`);
    } catch (error) {
      this.logger.error(`Failed to create statistics for UID ${uid}:`, error);
      throw error;
    }
  }
}
