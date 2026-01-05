import { Injectable } from '@nestjs/common';
import { Challenge } from '@common/interfaces/challenges';
import { CHALLENGES, SIZE_SMALL_MAP, SIZE_MEDIUM_MAP, SIZE_LARGE_MAP } from '@app/constants';


interface ChallengeScaling {
  goal?: number;
  reward?: number;
}

@Injectable()
export class ChallengeService {
  assignRandomChallenge(tiles: number[][], dimension: number): Challenge {
    const doors = this.findTotalDoors(tiles);
    const maxIndex = doors > 0 
      ? CHALLENGES.length 
      : CHALLENGES.length - 1;
    
    const randomIndex = Math.floor(Math.random() * maxIndex);
    const baseChallenge = CHALLENGES[randomIndex];

    // Apply scaling based on map size
    const scaling = this.getChallengeScaling(randomIndex, dimension);
    
    if (scaling) {
      return {
        ...baseChallenge,
        goal: scaling.goal ?? baseChallenge.goal,
        reward: scaling.reward ?? baseChallenge.reward,
      };
    }

    return { ...baseChallenge };
  }

  private getChallengeScaling(
    challengeIndex: number,
    dimension: number,
  ): ChallengeScaling | null {
    const scalingMap: Record<number, Record<number, ChallengeScaling>> = {
      0: {
        [SIZE_SMALL_MAP]: { goal: 5, reward: 50 },
        [SIZE_MEDIUM_MAP]: { goal: 10, reward: 100 },
        [SIZE_LARGE_MAP]: { goal: 15, reward: 150 },
      },
      2: {
        [SIZE_SMALL_MAP]: { goal: 1, reward: 50 },
        [SIZE_MEDIUM_MAP]: { goal: 2, reward: 100 },
        [SIZE_LARGE_MAP]: { goal: 2, reward: 100 },
      },
    };

    return scalingMap[challengeIndex]?.[dimension] || null;
  }

  private findTotalDoors(grid: number[][]): number {
    return this.countTiles((tile) => tile > 4, grid);
  }

  private countTiles(
    condition: (tile: number) => boolean,
    grid: number[][],
  ): number {
    let count = 0;
    for (const row of grid) {
      for (const tile of row) {
        if (condition(tile)) {
          count++;
        }
      }
    }
    return count;
  }

  getChallengeValue(player: any): number {
    const challenge = player?.assignedChallenge;
    const challengeId = challenge?.id;

    switch (challengeId) {
      case 0:
        const uniquePositions = player?.positionHistory
          ? new Set(player.positionHistory.map((pos: any) => `${pos.x},${pos.y}`)).size
          : 0;
        const goal0 = challenge?.goal ?? 0;
        return Math.min(uniquePositions, goal0);

      case 1:
        const evasions = player?.postGameStats?.evasions ?? 0;
        const goal1 = challenge?.goal ?? 0;
        return Math.min(evasions, goal1);

      case 2:
        const itemsCount = player?.collectedItems?.length ?? 0;
        const goal2 = challenge?.goal ?? 0;
        return Math.min(itemsCount, goal2);

      case 3:
        const victories = player?.postGameStats?.victories ?? 0;
        const goal3 = challenge?.goal ?? 0;
        return Math.min(victories, goal3);

      case 4:
        const doorCount = player?.postGameStats?.doorsInteracted ?? 0;
        const goal4 = challenge?.goal ?? 0;
        return Math.min(doorCount, goal4);

      default:
        return 0;
    }
  }

  /**
   * Checks if a player has successfully completed their challenge
   */
  isChallengeSuccess(player: any): boolean {
    if (!player?.assignedChallenge) return false;
    return this.getChallengeValue(player) >= (player.assignedChallenge.goal ?? 1);
  }
}