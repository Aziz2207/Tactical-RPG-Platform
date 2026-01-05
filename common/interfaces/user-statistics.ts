export interface UserStatistics {
  uid: string;
  numOfClassicPartiesPlayed: number;
  numOfCTFPartiesPlayed: number;
  numOfPartiesWon: number;
  gameDurationsForPlayer: number[];
  challengesCompleted: number;
}
