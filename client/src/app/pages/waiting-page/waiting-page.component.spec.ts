import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogMessages, DialogOptions, DialogResult, DialogTitle } from '@app/constants';
import { mockGames } from '@app/mocks/mock-game';
import { mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { mockRoom } from '@app/mocks/mock-room';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameListService } from '@app/services/game-list/game-list.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { GameService } from '@app/services/sockets/game/game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Game } from '@common/interfaces/game';
import { Behavior } from '@common/interfaces/player';
import { PathRoute } from '@common/interfaces/route';
import { BehaviorSubject, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { WaitingPageComponent } from './waiting-page.component';

describe('WaitingPageComponent', () => {
    let component: WaitingPageComponent;
    let fixture: ComponentFixture<WaitingPageComponent>;
    let gameListServiceSpy: jasmine.SpyObj<GameListService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let mapEditorServiceSpy: jasmine.SpyObj<MapEditorService>;
    let gameCreationServiceSpy: jasmine.SpyObj<GameCreationService>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let httpMock: HttpTestingController;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let accessCode: string;

    const activatedRouteSpy = {
        queryParams: of({ roomCode: '1234' }),
    };

    beforeEach(async () => {
        gameListServiceSpy = jasmine.createSpyObj('GameListService', ['chosenGameSubject']);
        gameListServiceSpy.chosenGameSubject = new BehaviorSubject<Game | null>(mockGames[0]);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        gameServiceSpy = jasmine.createSpyObj('GameService', [
            'joinRoom',
            'getPlayerNumber',
            'handleRoomDeleted',
            'handleLeftRoom',
            'handleKickPlayer',
            'openDialog',
            'openPlayerQuitDialog',
        ]);
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['on', 'send', 'off']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        mapEditorServiceSpy = jasmine.createSpyObj('MapEditorService', ['setMapToEdit']);
        gameCreationServiceSpy = jasmine.createSpyObj('GameCreationService', [
            'isModifiable',
            'setSelectedSize',
            'convertMapDimension',
            'loadedTiles',
            'loadedObjects',
            'loadedMapName',
        ]);
        accessCode = '1234';

        await TestBed.configureTestingModule({
            imports: [WaitingPageComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: GameListService, useValue: gameListServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: ActivatedRoute, useValue: activatedRouteSpy },
                { provide: MapEditorService, useValue: mapEditorServiceSpy },
                { provide: GameCreationService, useValue: gameCreationServiceSpy },
            ],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(WaitingPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.players = mockLobbyPlayers;

        const request = httpMock.expectOne(`${environment.serverUrl}/chat?roomCode=${accessCode}`);
        request.flush([]);
    });

    afterEach(() => {
        httpMock.verify();
    });

    afterAll(() => {
        gameListServiceSpy.chosenGameSubject.complete();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should navigate to /home if no game is selected (refresh page)', () => {
            gameListServiceSpy.chosenGameSubject.next(null);
            component.ngOnInit();
            expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.Home]);
        });

        it('should navigate to /home if no game is received', () => {
            component.accessCode = accessCode;
            component.ngOnInit();
            expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.Home]);
        });

        it('should navigate to /home if no room is created', () => {
            component.ngOnInit();
            expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.Home]);
        });

        it('should set chosenGame when a game is selected', () => {
            const mockGame: Game = mockGames[0];
            gameListServiceSpy.chosenGameSubject.next(mockGame);
            fixture.detectChanges();
            expect(component.chosenGame).toEqual(mockGame);
        });

        it('should call initSocketListeners', () => {
            spyOn(component, 'initSocketListeners');
            component.ngOnInit();
            expect(component.initSocketListeners).toHaveBeenCalled();
        });
    });

    describe('initSocketListeners', () => {
        it('should call onRoomDeleted, onLeftRoom, onKickPlayer when receive corresponding event', () => {
            component.initSocketListeners();
            expect(gameServiceSpy.handleRoomDeleted).toHaveBeenCalled();
            expect(gameServiceSpy.handleLeftRoom).toHaveBeenCalled();
            expect(gameServiceSpy.handleKickPlayer).toHaveBeenCalled();
        });

        it('should set player list when it is updated', () => {
            spyOn(component, 'onMaxPlayers');
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'updatedPlayer') {
                    callback(mockRoom as T);
                }
            });
            component.initSocketListeners();
            expect(component.players).toBe(mockRoom.listPlayers);
            expect(component.onMaxPlayers).toHaveBeenCalled();
        });

        it('should set isAdmin to true is player admin', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'isPlayerAdmin') {
                    callback(true as T);
                }
            });
            component.initSocketListeners();
            expect(component.isAdmin).toBe(true);
        });

        it('should call loadMap and set the chosenGame when startGame is received', () => {
            component.accessCode = accessCode;
            gameListServiceSpy.chosenGameSubject.next(mockGames[0]);
            spyOn(component, 'loadMap');
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'startGame') {
                    callback(mockRoom as T);
                }
            });
            component.initSocketListeners();
            expect(component.chosenGame).toEqual(mockRoom.gameMap);
            expect(component.loadMap).toHaveBeenCalled();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/game-page'], { queryParams: { roomCode: mockRoom.roomId } });
        });
    });

    it('should called openPlayerQuitDialog in handleExit', () => {
        component.handleExit(accessCode);
        expect(gameServiceSpy.openPlayerQuitDialog).toHaveBeenCalledWith(accessCode);
    });

    it('should update gameService isRoomLocked and send event', () => {
        component.isLocked = true;
        component.onLockChange();

        expect(gameServiceSpy.isRoomLocked).toBe(true);
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('changeLockRoom', true);
    });

    it('should do everything in loadMap correctly', () => {
        gameCreationServiceSpy.isModifiable = true;
        gameCreationServiceSpy.isNewGame = true;
        component.chosenGame = mockGames[0];
        component.loadMap();

        expect(gameCreationServiceSpy.isModifiable).toBeFalse();
        expect(gameCreationServiceSpy.isNewGame).toBeFalse();
        expect(mapEditorServiceSpy.setMapToEdit).toHaveBeenCalled();
        expect(gameCreationServiceSpy.setSelectedSize).toHaveBeenCalled();
        expect(gameCreationServiceSpy.convertMapDimension).toHaveBeenCalled();
        expect(gameCreationServiceSpy.loadedTiles).toEqual(component.chosenGame.tiles);
        expect(gameCreationServiceSpy.loadedObjects).toEqual(component.chosenGame.itemPlacement);
        expect(gameCreationServiceSpy.loadedMapName).toEqual(component.chosenGame.name);
    });

    describe('handleStartGame', () => {
        it('should open the dialog and not navigate when only 1 player', () => {
            component.players = [];
            component.handleStartGame();
            expect(gameServiceSpy.openDialog).toHaveBeenCalledWith({
                title: DialogTitle.StartGame,
                messages: [DialogMessages.NotEnoughPlayers],
                options: [DialogOptions.Close],
                confirm: false,
            });
        });

        it('should open the dialog when the room is not locked', () => {
            component.handleStartGame();
            expect(gameServiceSpy.openDialog).toHaveBeenCalledWith({
                title: DialogTitle.StartGame,
                messages: [DialogMessages.RoomLocked],
                options: [DialogOptions.Close],
                confirm: false,
            });
        });

        it('should navigate to /game-page when dialog result is "Confirmer"', () => {
            // eslint-disable-next-line -- confirmStartGame is private and we want to spyOn
            spyOn<any>(component, 'confirmStartGame');
            component.isLocked = true;
            component.handleStartGame();

            expect(component['confirmStartGame']).toHaveBeenCalled();
        });
    });

    it('should do everything in loadMap correctly', () => {
        gameCreationServiceSpy.isModifiable = true;
        gameCreationServiceSpy.isNewGame = true;
        component.chosenGame = mockGames[0];
        component.loadMap();

        expect(gameCreationServiceSpy.isModifiable).toBeFalse();
        expect(gameCreationServiceSpy.isNewGame).toBeFalse();
        expect(mapEditorServiceSpy.setMapToEdit).toHaveBeenCalled();
        expect(gameCreationServiceSpy.setSelectedSize).toHaveBeenCalled();
        expect(gameCreationServiceSpy.convertMapDimension).toHaveBeenCalled();
        expect(gameCreationServiceSpy.loadedTiles).toEqual(component.chosenGame.tiles);
        expect(gameCreationServiceSpy.loadedObjects).toEqual(component.chosenGame.itemPlacement);
        expect(gameCreationServiceSpy.loadedMapName).toEqual(component.chosenGame.name);
    });

    it('should open the dialog and send startGame on confirm', (done) => {
        gameServiceSpy.openDialog.and.returnValue(of({ action: DialogResult.Right }));

        component['confirmStartGame']();
        expect(gameServiceSpy.openDialog).toHaveBeenCalledWith({
            title: DialogTitle.StartGame,
            messages: [DialogMessages.ConfirmStartGame],
            options: [DialogOptions.Cancel, DialogOptions.Confirm],
            confirm: true,
        });

        setTimeout(() => {
            expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('startGame');
            expect(component.isLocked).toBeTrue();
            done();
        });
    });

    it('should locked room when max players', () => {
        spyOn(component, 'isMaxPlayersReached').and.returnValue(true);
        spyOn(component, 'onLockChange');
        component.onMaxPlayers();
        expect(component.isLocked).toBeTrue();
        expect(component.onLockChange).toHaveBeenCalled();
    });

    it('should open max players dialog when locked and max players reached', () => {
        component.isLocked = true;
        spyOn(component, 'isMaxPlayersReached').and.returnValue(true);

        component.toggleBotProfileVisibility();

        expect(gameServiceSpy.openDialog).toHaveBeenCalledWith({
            title: DialogTitle.MaxPlayers,
            messages: [DialogMessages.MaxPlayers],
            options: [DialogOptions.Close],
            confirm: false,
        });
        expect(component.isBotProfileVisible).toBeFalse();
    });

    it('should open add bot when locked dialog when locked and max players not reached', () => {
        component.isLocked = true;
        spyOn(component, 'isMaxPlayersReached').and.returnValue(false);

        component.toggleBotProfileVisibility();

        expect(gameServiceSpy.openDialog).toHaveBeenCalledWith({
            title: DialogTitle.AddBotWhenLocked,
            messages: [DialogMessages.AddBotWhenLocked],
            options: [DialogOptions.Close],
            confirm: false,
        });
        expect(component.isBotProfileVisible).toBeFalse();
    });

    it('should toggle bot profile visibility when not locked', () => {
        component.isLocked = false;
        component.isBotProfileVisible = false;

        component.toggleBotProfileVisibility();

        expect(component.isBotProfileVisible).toBeTrue();
    });

    it('should send createBot with aggressive behavior when addBot is called with true', () => {
        component.addBot(true);

        expect(component.isBotProfileVisible).toBeFalse();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('createBot', Behavior.Aggressive);
    });

    it('should send createBot with defensive behavior when addBot is called with false', () => {
        component.addBot(false);

        expect(component.isBotProfileVisible).toBeFalse();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('createBot', Behavior.Defensive);
    });
});
