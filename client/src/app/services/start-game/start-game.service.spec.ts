import { TestBed } from '@angular/core/testing';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { StartGameService } from '@app/services/start-game/start-game.service';
import { ModeEnum } from '@common/mode-enum';
import { of, throwError } from 'rxjs';
import { CommunicationService } from '../communication/communication.service';

describe('StartGameService', () => {
    let service: StartGameService;
    let mockCommunicationService: jasmine.SpyObj<CommunicationService>;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;
    const mockGames = [
        {
            title: 'Game 1',
            _id: '1',
            isVisible: true,
            size: 10,
            mode: 'CTF',
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.CTF,
            },
        },
        {
            title: 'Game 2',
            _id: '2',
            isVisible: false,
            size: 10,
            mode: 'CTF',
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.CTF,
            },
        },
        {
            title: 'Game 3',
            _id: '3',
            isVisible: true,
            size: 10,
            mode: 'CTF',
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.CTF,
            },
        },
    ];

    beforeEach(() => {
        mockCommunicationService = jasmine.createSpyObj('CommunicationService', ['gamesGet', 'gameGet']);
        mockCommunicationService.gamesGet.and.returnValue(of(mockGames));
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['createGame']);
        mockCommunicationService.gameGet.and.callFake((id: string) => {
            const game = mockGames.find((g) => g._id === id);
            if (game) {
                return of(game);
            } else {
                return throwError(() => new Error('Game not found'));
            }
        });

        TestBed.configureTestingModule({
            providers: [
                { provide: CommunicationService, useValue: mockCommunicationService },
                { provide: RoomManagerService, useValue: mockRoomManagerService },
            ],
        });
        service = TestBed.inject(StartGameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize and select the first visible game', (done) => {
        service.stateSelection$.subscribe((game) => {
            if (game) {
                expect(game._id).toEqual('1');
                expect(game.title).toEqual('Game 1');
                done();
            }
        });
    });

    it('should have stateList$ containing only visible games', (done) => {
        service.stateList$.subscribe((games) => {
            if (games) {
                expect(games.length).toEqual(2);
                expect(games[0]._id).toEqual('1');
                expect(games[1]._id).toEqual('3');
                done();
            }
        });
    });

    it('should select a game and update stateSelection$', (done) => {
        service.selectGame('3');
        service.stateSelection$.subscribe((game) => {
            if (game && game._id === '3') {
                expect(game.title).toEqual('Game 3');
                done();
            }
        });
    });

    it('should reset and select the first visible game', (done) => {
        service.reset();
        service.stateSelection$.subscribe((game) => {
            if (game) {
                expect(game._id).toEqual('1');
                expect(game.title).toEqual('Game 1');
                done();
            }
        });
    });
});
