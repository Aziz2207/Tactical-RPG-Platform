import { TestBed } from '@angular/core/testing';
import { GameLogService } from '@app/services/game-log/game-log-service.service';
import { SocketService } from '@app/services/socket/socket.service';
import { LogMessage } from '@common/interfaces/log-message';
import { Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

describe('GameLogService', () => {
    let service: GameLogService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    const mockLogMessage: LogMessage = {
        time: '12:00:00',
        content: 'joueur a rejoint la partie',
        playersInvolved: ['joueur'],
    };
    const mockLogs: LogMessage[] = [mockLogMessage];
    let logMessageSubject: Subject<LogMessage>;
    let initialLogsSubject: Subject<LogMessage[]>;

    beforeEach(() => {
        logMessageSubject = new Subject<LogMessage>();
        initialLogsSubject = new Subject<LogMessage[]>();

        const socketSpy = jasmine.createSpyObj('SocketService', ['on', 'send', 'getId']);

        socketSpy.on.and.callFake((event: string, callback: (data: unknown) => void) => {
            if (event === 'gameLog') {
                logMessageSubject.subscribe(callback);
            } else if (event === 'getInitialLogs') {
                initialLogsSubject.subscribe(callback);
            }
        });

        TestBed.configureTestingModule({
            providers: [GameLogService, { provide: SocketService, useValue: socketSpy }],
        });

        service = TestBed.inject(GameLogService);
        socketServiceSpy = TestBed.inject(SocketService) as jasmine.SpyObj<SocketService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    // it('should initialize log listener and update log messages on receiving gameLog event', (done) => {
    //     service
    //         .getLogMessages()
    //         .pipe(
    //             filter((messages) => messages.length > 0),
    //             take(1),
    //         )
    //         .subscribe((messages) => {
    //             expect(messages).toContain(mockLogMessage);
    //             done();
    //         });

    //     logMessageSubject.next(mockLogMessage);
    // });

    it('should request initial logs and update log messages on receiving getInitialLogs event', (done) => {
        service.setRoomId('testRoomId');

        service
            .getLogMessages()
            .pipe(
                filter((messages) => messages.length > 0),
                take(1),
            )
            .subscribe((messages) => {
                expect(messages).toEqual(mockLogs);
                done();
            });

        initialLogsSubject.next(mockLogs);
    });

    it('should call socketService.send with correct parameters when requesting initial logs', () => {
        service.setRoomId('testRoomId');
        expect(socketServiceSpy.send).toHaveBeenCalledWith('getInitialLogs', { roomId: 'testRoomId' });
    });

    it('should return player ID from socketService', () => {
        socketServiceSpy.getId.and.returnValue('123');
        expect(service.getPlayerId()).toBe('123');
    });
});
