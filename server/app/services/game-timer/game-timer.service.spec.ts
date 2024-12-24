import { GameTimer } from '@app/interfaces/game-timer';
import { CONSTANTS } from '@common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { GameTimerService } from './game-timer.service';

describe('ActiveSessionService', () => {
    let service: GameTimerService;
    let mockTimer: GameTimer;

    beforeEach(async () => {
        jest.useFakeTimers();
        mockTimer = {
            count: 1,
            interval: null,
            tickSpeed: CONSTANTS.MS_TO_SECONDS_CONVERSION,
            increment: false,
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [GameTimerService],
        }).compile();

        service = module.get<GameTimerService>(GameTimerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('createTimer should create a valid timer', () => {
        const count = 10;
        const gameTimer = service.createTimer(count, CONSTANTS.MS_TO_SECONDS_CONVERSION);
        expect(gameTimer).toBeTruthy();
        expect(gameTimer.interval).toBeFalsy();
        expect(gameTimer.count).toBe(count);
    });

    it('startTimer should start a timer and call callbacks onSecond and onExpire', () => {
        let onSecondCalled = false;
        let onExpireCalled = false;
        const onSecond = () => {
            onSecondCalled = true;
        };
        const onExpire = () => {
            onExpireCalled = true;
        };
        service.startTimer(mockTimer, onSecond, onExpire);
        jest.advanceTimersByTime(CONSTANTS.MS_TO_SECONDS_CONVERSION);
        expect(onSecondCalled).toEqual(true);
        jest.advanceTimersByTime(CONSTANTS.MS_TO_SECONDS_CONVERSION);
        expect(onExpireCalled).toEqual(true);
    });

    it('stopTimer should stop the timers interval', () => {
        let intervalCalled = false;
        mockTimer.interval = setInterval(() => {
            intervalCalled = true;
        }, CONSTANTS.MS_TO_SECONDS_CONVERSION);
        service.stopTimer(mockTimer);
        jest.advanceTimersByTime(CONSTANTS.MS_TO_SECONDS_CONVERSION);
        expect(intervalCalled).toEqual(false);
    });
});
