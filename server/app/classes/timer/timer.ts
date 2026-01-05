import { MILLISECONDS_IN_SECOND } from '@app/constants';

export class Timer {
    private intervalId: NodeJS.Timeout | null = null;
    private timeRemaining: number;
    private isPaused = false;
    private isTimerRunning: boolean = true;

    startTimer(duration: number, onTickCallback: (timeRemaining: number) => void) {
        this.isTimerRunning = true;
        clearInterval(this.intervalId);
        this.timeRemaining = duration;
        onTickCallback(this.timeRemaining);

        if (this.isTimerRunning) {
            this.intervalId = setInterval(() => {
                this.timeRemaining--;
                onTickCallback(this.timeRemaining);

                if (this.timeRemaining <= -1 && this.intervalId !== null) {
                    clearInterval(this.intervalId);
                    this.timerFinished();
                }
            }, MILLISECONDS_IN_SECOND);
        }
    }

    getTimeRemaining() {
        return this.timeRemaining;
    }

    resetTimer(duration: number, onTickCallback: (timeRemaining: number) => void) {
        this.stopTimer();
        this.timeRemaining = duration;
        this.startTimer(duration, onTickCallback);
    }

    stopTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    pauseTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.isPaused = true;
        }
    }

    resumeTimer(onTickCallback: (timeRemaining: number) => void) {
        if (this.isPaused) {
            this.isPaused = false;
            this.isTimerRunning = true;
            this.startTimer(this.timeRemaining, onTickCallback);
        }
    }

    timerFinished() {
        this.timeRemaining = 0;
        this.isTimerRunning = false;
    }
}
