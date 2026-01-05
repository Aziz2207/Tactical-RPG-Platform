import { FORWARD_TIME, MILLISECONDS_IN_SECOND, SECS_IN_HOUR } from '@app/constants';
import { Stopwatch } from './stopwatch';

jest.useFakeTimers();

describe('Stopwatch', () => {
    let stopwatch: Stopwatch;

    beforeEach(() => {
        stopwatch = new Stopwatch();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    it('should start the stopwatch', () => {
        stopwatch.start();
        expect(stopwatch['startTime']).not.toBeNull();
    });

    it('should not reset startTime if called multiple times', () => {
        stopwatch.start();
        const initialStartTime = stopwatch['startTime'];
        jest.advanceTimersByTime(FORWARD_TIME);
        stopwatch.start();
        expect(stopwatch['startTime']).toBe(initialStartTime);
    });

    it('should stop the stopwatch and record elapsed time', () => {
        stopwatch.start();
        jest.advanceTimersByTime(FORWARD_TIME);
        stopwatch.stop();
        expect(stopwatch['startTime']).toBeNull();
        expect(stopwatch['elapsedTime']).toBe(1);
    });

    it('should not modify elapsedTime if stopped multiple times', () => {
        stopwatch.start();
        jest.advanceTimersByTime(FORWARD_TIME);
        stopwatch.stop();
        const firstElapsedTime = stopwatch['elapsedTime'];
        jest.advanceTimersByTime(FORWARD_TIME);
        stopwatch.stop();
        expect(stopwatch['elapsedTime']).toBe(firstElapsedTime);
    });

    it('should return formatted time after stop', () => {
        stopwatch.start();
        jest.advanceTimersByTime((SECS_IN_HOUR * MILLISECONDS_IN_SECOND) / 2);
        stopwatch.stop();
        expect(stopwatch.getTime()).toBe('30min 00s');
    });

    it('should return formatted time without starting', () => {
        expect(stopwatch.getTime()).toBe('00min 00s');
    });
});
