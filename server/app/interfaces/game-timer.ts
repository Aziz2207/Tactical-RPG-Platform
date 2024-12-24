export interface GameTimer {
    count: number;
    interval: NodeJS.Timer | null; // It can be running or stopped, so null or Timer.
    tickSpeed: number;
    increment: boolean;
    maxCount?: number;
}
