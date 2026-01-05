import { FORWARD_TIME, STARTING_TIME } from '@app/constants';
import { Timer } from './timer';

jest.useFakeTimers();

describe('Timer', () => {
    let timer: Timer;
    const onTickCallback = jest.fn();

    beforeEach(() => {
        timer = new Timer();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    it('should start the timer and call update callback', () => {
        timer.startTimer(STARTING_TIME, onTickCallback);
        expect(onTickCallback).toHaveBeenCalledTimes(1);
        expect(timer['timeRemaining']).toBe(STARTING_TIME);

        jest.advanceTimersByTime(FORWARD_TIME);
        expect(onTickCallback).toHaveBeenCalledTimes(2);
        expect(onTickCallback).toHaveBeenCalledWith(2);
        expect(timer['timeRemaining']).toBe(2);
    });

    it('should stop the timer when time is up', () => {
        jest.spyOn(timer, 'timerFinished').mockImplementation(jest.fn());

        timer.startTimer(1, onTickCallback);
        jest.advanceTimersByTime(FORWARD_TIME);
        expect(onTickCallback).toHaveBeenCalledWith(0);

        jest.advanceTimersByTime(FORWARD_TIME);
        expect(timer['intervalId']).not.toBeNull();
        expect(timer['timeRemaining']).toBe(-1);
    });

    it('should reset the timer with new duration of 2 seconds', () => {
        jest.spyOn(timer, 'stopTimer').mockImplementation(jest.fn());

        timer.startTimer(2, onTickCallback);
        jest.advanceTimersByTime(FORWARD_TIME);
        expect(timer['timeRemaining']).toBe(1);

        timer.resetTimer(2, onTickCallback);
        expect(timer['timeRemaining']).toBe(2);
    });

    it('should stop the timer and clear the interval', () => {
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        timer.startTimer(STARTING_TIME, onTickCallback);

        jest.advanceTimersByTime(FORWARD_TIME);
        timer.stopTimer();

        expect(timer['intervalId']).not.toBeNull();
        expect(clearIntervalSpy).toHaveBeenCalledWith(timer['intervalId']);
    });

    it('should pause the timer and clear the interval', () => {
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        timer.startTimer(STARTING_TIME, onTickCallback);

        jest.advanceTimersByTime(FORWARD_TIME);
        timer.pauseTimer();

        expect(timer['intervalId']).not.toBeNull();
        expect(clearIntervalSpy).toHaveBeenCalledWith(timer['intervalId']);
        expect(timer['isPaused']).toBe(true);
    });

    it('should resume the timer if paused', () => {
        timer['isPaused'] = true;
        jest.spyOn(timer, 'startTimer').mockImplementation(jest.fn());

        timer.resumeTimer(onTickCallback);

        expect(timer.startTimer).toHaveBeenCalled();
        expect(timer['isPaused']).toBe(false);
    });

    it('should resume the timer if paused', () => {
        timer['isPaused'] = true;
        jest.spyOn(timer, 'startTimer').mockImplementation(jest.fn());

        timer.resumeTimer(onTickCallback);

        expect(timer.startTimer).toHaveBeenCalled();
        expect(timer['isPaused']).toBe(false);
    });

    it('should  set timeRemaining and isTimerRunning on timerFinished', () => {
        timer.timerFinished();
        expect(timer['timeRemaining']).toBe(0);
        expect(timer['isTimerRunning']).toBe(false);
    });

    it('should return the correct remaining time', () => {
        timer.startTimer(STARTING_TIME, onTickCallback);

        expect(timer.getTimeRemaining()).toBe(STARTING_TIME);
    });
});
