import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameLogService } from '@app/services/game-log/game-log-service.service';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { LogMessage } from '@common/interfaces/log-message';
import { of } from 'rxjs';
import { GameLogComponent } from './game-log.component';

describe('GameLogComponent', () => {
    let component: GameLogComponent;
    let fixture: ComponentFixture<GameLogComponent>;
    let mockGameLogService: jasmine.SpyObj<GameLogService>;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;

    const mockLogMessages: LogMessage[] = [
        {
            time: '12:00:00',
            content: 'Joueur a rejoint la partie',
            playersInvolved: ['joueur'],
        },
        {
            time: '12:01:00',
            content: 'Joueur a quitté la partie',
            playersInvolved: ['joueur'],
        },
    ];

    beforeEach(async () => {
        mockGameLogService = jasmine.createSpyObj<GameLogService>('GameLogService', ['getLogMessages', 'getPlayerId', 'setRoomId', 'clearLogs']);
        mockRoomManagerService = jasmine.createSpyObj<RoomManagerService>('RoomManagerService', [], {
            room: {
                code: 'testRoomCode',
                players: [],
                maxPlayers: 4,
                isLocked: false,
                takenCharacters: [],
                isActive: true,
            },
        });

        mockGameLogService.getLogMessages.and.returnValue(of(mockLogMessages));
        mockGameLogService.getPlayerId.and.returnValue('joueur');

        await TestBed.configureTestingModule({
            providers: [
                { provide: GameLogService, useValue: mockGameLogService },
                { provide: RoomManagerService, useValue: mockRoomManagerService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameLogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with log messages', () => {
        expect(component.logMessages).toEqual(mockLogMessages);
        expect(component.filteredMessages).toEqual(mockLogMessages);
    });

    it('should set playerId and roomId on initialization', () => {
        expect(component.playerId).toBe('joueur');
        expect(mockGameLogService.setRoomId).toHaveBeenCalledWith('testRoomCode');
    });

    it('should filter messages when toggleFilter is called', () => {
        component.toggleFilter();
        expect(component.showOnlyInvolved).toBeTrue();
        const expectedFilteredMessages = mockLogMessages.filter((msg) => msg.playersInvolved.includes('joueur'));
        expect(component.filteredMessages).toEqual(expectedFilteredMessages);
    });

    it('should reset filters when toggleFilter is called again', () => {
        component.toggleFilter();
        component.toggleFilter();

        expect(component.showOnlyInvolved).toBeFalse();
        expect(component.filteredMessages).toEqual(mockLogMessages);
    });

    it('should unsubscribe on destroy', () => {
        spyOn(component['gameLoggerSubscription'], 'unsubscribe');
        component.ngOnDestroy();
        expect(component['gameLoggerSubscription'].unsubscribe).toHaveBeenCalled();
    });
});
