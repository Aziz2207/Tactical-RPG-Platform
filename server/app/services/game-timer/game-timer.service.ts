import { GameTimer } from '@app/interfaces/game-timer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameTimerService {
    // Creates new instance of GameTimer interface ready to be used
    createTimer(count: number, tickTimeMS: number, increment: boolean = false, maxCount?: number): GameTimer {
        const timer: GameTimer = {
            count,
            interval: null,
            tickSpeed: tickTimeMS,
            increment,
            maxCount,
        };
        return timer;
    }

    // Starts the timer.
    // Calls onSecond callback after every second with count
    // calls onExpire (if exists) when timer reaches 0.
    startTimer(timer: GameTimer, onTick: (count: number) => void, onExpire?: () => void) {
        onTick(timer.count);
        timer.interval = setInterval(() => {
            const decrementingTimerExpired = !timer.increment && timer.count <= 0;
            const incrementingTimerExpired = timer.increment && timer.maxCount !== undefined && timer.count >= timer.maxCount;
            if (decrementingTimerExpired || incrementingTimerExpired) {
                this.stopTimer(timer);
                if (onExpire) onExpire();
            } else {
                if (timer.increment) timer.count++;
                else timer.count--;
                onTick(timer.count);
            }
        }, timer.tickSpeed);
    }

    // Stops timer by stopping its interval. Sets it to null.
    stopTimer(timer: GameTimer) {
        if (timer.interval) {
            clearInterval(timer.interval);
            timer.interval = null;
        }
    }
}
