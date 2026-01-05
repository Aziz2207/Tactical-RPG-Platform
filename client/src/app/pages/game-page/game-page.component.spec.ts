import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ElementRef, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ChatBoxComponent } from '@app/components/chat-box/chat-box.component';
import { SimpleDialogComponent } from '@app/components/simple-dialog/simple-dialog.component';
import { TimerComponent } from '@app/components/timer/timer.component';
import { ATTACK_TIME, DEFAULT_ACTION_POINT, STARTING_TIME, TURN_TIME } from '@app/constants';
import { mockCombatPlayers } from '@app/mocks/mock-combat-infos';
import { mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { mockPositions } from '@app/mocks/mock-map';
import { mockPlayer } from '@app/mocks/mock-player';
import { mockPlayers } from '@app/mocks/mock-players';
import { mockRoom } from '@app/mocks/mock-room';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { NavigationService } from '@app/services/navigation/navigation.service';
import { CombatService } from '@app/services/sockets/combat/combat.service';
import { GameService } from '@app/services/sockets/game/game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { BehaviorSubject, of } from 'rxjs';
import { Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { GamePageComponent } from './game-page.component';

/* eslint-disable max-lines */
describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let timerSpy: jasmine.SpyObj<TimerComponent>;
    let fixture: ComponentFixture<GamePageComponent>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let chatBoxSpy: jasmine.SpyObj<ChatBoxComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SimpleDialogComponent>>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let httpMock: HttpTestingController;
    let mockSocket: Socket;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let combatServiceSpy: jasmine.SpyObj<CombatService>;
    let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
    let gameCreationServiceSpy: jasmine.SpyObj<GameCreationService>;
    let sizeSubjectMock: BehaviorSubject<string | null>;

    const accessCode = '1234';

    beforeEach(async () => {
        sizeSubjectMock = new BehaviorSubject<string | null>(null);
        gameCreationServiceSpy = jasmine.createSpyObj('GameCreationService', [
            'loadExistingObjects',
            'loadExistingTiles',
            'updateDimensions',
            'sizeSubject',
        ]);
        combatServiceSpy = jasmine.createSpyObj(CombatService, ['onEvasion', 'onCombatEnd', 'isInCombat', 'initializeCombat']);
        chatBoxSpy = jasmine.createSpyObj(ChatBoxComponent, ['unsubscribe', 'subscribe']);
        timerSpy = jasmine.createSpyObj(TimerComponent, ['pauseTimer', 'resumeTimer']);
        socketCommunicationServiceSpy = jasmine.createSpyObj(SocketCommunicationService, ['on', 'send', 'isSocketAlive', 'connect']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        dialogRefSpy = jasmine.createSpyObj('SimpleDialogComponent', ['open', 'afterClosed', 'close']);
        dialogRefSpy.afterClosed.and.returnValue(of({ action: 'left' }));
        dialogSpy.open.and.returnValue(dialogRefSpy);
        mockSocket = { data: { roomCode: '1234' }, id: 'player' } as unknown as Socket;
        gameServiceSpy = jasmine.createSpyObj('GameService', [
            'navigateToHome',
            'addGamePageListeners',
            'isActivePlayer',
            'toggleActionDoorSelected',
            'toggleActionCombatSelected',
            'isCurrentPlayerAdmin',
            'handleExit',
            'hasActionPoints',
            'isActionDoorSelected',
            'isActionCombatSelected',
            'playersTarget',
            'doorsTarget',
        ]);
        navigationServiceSpy = jasmine.createSpyObj('NavigationService', ['isDebugMode']);

        combatServiceSpy.combatTurnTime$ = of(ATTACK_TIME);
        combatServiceSpy.activePlayer = mockPlayers[0];
        combatServiceSpy.opponent = mockPlayers[1];
        combatServiceSpy.attacker = mockPlayers[0];
        combatServiceSpy.defender = mockPlayers[1];
        combatServiceSpy.evasionsActivePlayer = [1, 1];
        combatServiceSpy.evasionsOpponent = [1, 1];
        combatServiceSpy.activePlayerResult = { total: 5, diceValue: 2 };
        combatServiceSpy.opponentResult = { total: 3, diceValue: 3 };
        gameCreationServiceSpy.sizeSubject = sizeSubjectMock;

        await TestBed.configureTestingModule({
            imports: [GamePageComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: CombatService, useValue: combatServiceSpy },
                { provide: ChatBoxComponent, useValue: chatBoxSpy },
                { provide: TimerComponent, useValue: timerSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: NavigationService, useValue: navigationServiceSpy },
                { provide: ActivatedRoute, useValue: { queryParams: of({ roomCode: '1234' }) } },
                { provide: GameCreationService, useValue: gameCreationServiceSpy },
            ],
        }).compileComponents();

        socketCommunicationServiceSpy.socket = mockSocket;

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
        component.allPlayers = mockPlayers;
        fixture.detectChanges();
        component.activePlayer = JSON.parse(JSON.stringify(mockLobbyPlayers[0]));

        const request = httpMock.expectOne(`${environment.serverUrl}/chat?roomCode=${accessCode}`);
        request.flush([]);
    });

    afterEach(() => {
        httpMock.verify();
        fixture.destroy();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should return socket id', () => {
        expect(component.getSocketId()).toEqual(socketCommunicationServiceSpy.socket.id);
    });

    describe('ngOnInit', () => {
        it('should set players and health on mapInformation event', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.MapInformation) {
                    callback(mockRoom as T);
                }
            });
            spyOn(component, 'replenishHealth');
            spyOn(component, 'initCombatListeners');
            spyOn(component, 'initGameListeners');
            spyOn(component, 'onBeforeStartTurn');

            component.ngOnInit();
            expect(component.allPlayers).toEqual(mockRoom.listPlayers);
            expect(component.replenishHealth).toHaveBeenCalled();
        });

        it('should call the correct functions on StartFight', () => {
            const data = { combatPlayers: mockCombatPlayers, isActivePlayerAttacker: true };
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.StartFight) {
                    callback(data as T);
                }
            });
            component.isInCombat = false;
            component.activePlayer = { ...mockPlayers[0] };
            component.activePlayer.attributes.actionPoints = 1;
            gameServiceSpy.isActionCombatSelected = true;
            component.initCombatListeners();
            expect(combatServiceSpy.isInCombat).toBeTrue();
            expect(component.activePlayer.attributes.actionPoints).toEqual(0);
            expect(gameServiceSpy.isActionCombatSelected).toBeFalse();
            expect(combatServiceSpy.initializeCombat).toHaveBeenCalled();
        });

        it('should set attackAround gameService.playersTarget', () => {
            const data = { attackAround: true, targets: [{ ...mockPlayers[0] }] };
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.AttackAround) {
                    callback(data as T);
                }
            });
            component.attackAround = false;
            gameServiceSpy.playersTarget = [{ ...mockPlayers[0] }];
            component.initCombatListeners();
            expect(component.attackAround).toBeTrue();
            expect(gameServiceSpy.playersTarget).toEqual([mockPlayers[0]]);
        });

        it('should set isDebugMode in navigationService', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.DebugMode) {
                    callback(true as T);
                }
            });
            navigationServiceSpy.isDebugMode = false;
            component.initCombatListeners();
            expect(navigationServiceSpy.isDebugMode).toBeFalse();
        });

        it('should set doorAround and doorsTarget', () => {
            const data = { doorAround: true, targets: mockPositions };
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.DoorAround) {
                    callback(data as T);
                }
            });
            component.doorAround = false;
            gameServiceSpy.doorsTarget = [mockPositions[0]];
            component.initCombatListeners();
            expect(component.doorAround).toBeTrue();
            expect(gameServiceSpy.doorsTarget).toEqual(mockPositions);
        });

        it('shpuld decrease action points by 1 on DoorClicked', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.DoorClicked) {
                    callback({} as T);
                }
            });
            component.activePlayer = { ...mockPlayers[0] };
            component.activePlayer.attributes.actionPoints = 1;
            component.initCombatListeners();
            expect(component.activePlayer.attributes.actionPoints).toEqual(1);
        });
    });

    describe('initGameListener', () => {
        it('should set attackAround and playersTargets on AttackAround event', () => {
            const targetPlayer = JSON.parse(JSON.stringify(mockPlayer));
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.AttackAround) {
                    callback({ attackAround: true, targets: [targetPlayer] } as T);
                }
            });
            component.initGameListeners();
            expect(gameServiceSpy.addGamePageListeners).toHaveBeenCalled();
            expect(component.attackAround).toBe(true);
            expect(gameServiceSpy.playersTarget).toEqual([targetPlayer]);
        });

        it('should set doorAround and doorTargets on DoorAround event', () => {
            const targetDoor = { x: 1, y: 1 };
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.DoorAround) {
                    callback({ doorAround: true, targets: [targetDoor] } as T);
                }
            });
            component.initGameListeners();
            expect(gameServiceSpy.addGamePageListeners).toHaveBeenCalled();
            expect(component.doorAround).toBe(true);
            expect(gameServiceSpy.doorsTarget).toEqual([targetDoor]);
        });

        it('should decrement action point on DoorClicked', () => {
            component.activePlayer.attributes.actionPoints = DEFAULT_ACTION_POINT;
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.DoorClicked) {
                    callback({} as T);
                }
            });
            component.initGameListeners();
            expect(component.activePlayer.attributes.actionPoints).toBe(0);
        });

        it('should update players list when a player disconnects', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.PlayerDisconnected) {
                    callback(mockPlayers as T);
                }
            });
            component.initGameListeners();
            expect(component.allPlayers).toEqual(mockPlayers);
        });

        it('should set active player name on otherPlayerTurn event', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.OtherPlayerTurn) {
                    callback(mockPlayer.name as T);
                }
            });
            component.initGameListeners();
            expect(component.activePlayerName).toEqual(mockPlayer.name);
        });
    });

    describe('initDebugModeListener', () => {
        it('should toggle debug mode on DebugMode event', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.DebugMode) {
                    callback(true as T);
                }
            });
            spyOn(component, 'toggleDebugMode');
            component.initDebugModeListener();
            expect(component.toggleDebugMode).toHaveBeenCalled();
            expect(navigationServiceSpy.isDebugMode).toBe(true);
        });
    });

    describe('initCombatListeners', () => {
        it('should set CombatEnd to true on combatInProgress event', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.CombatEnd) {
                    callback({ listPlayers: mockPlayers, player: mockPlayers[0] } as T);
                }
            });
            spyOn(component, 'setPlayersOnCombatDone');
            component.initCombatListeners();
            expect(component.setPlayersOnCombatDone).toHaveBeenCalledWith(mockPlayers);
            expect(combatServiceSpy.onCombatEnd).toHaveBeenCalledWith(mockPlayers[0]);
            expect(navigationServiceSpy.players).toEqual(mockPlayers);
        });

        it('should set combatInProgress to true on combatInProgress event', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.CombatInProgress) {
                    callback({} as T);
                }
            });
            component.initCombatListeners();
            expect(component.combatInProgress).toBe(true);
        });

        it('should set combatInProgress to false on combatOver event', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.CombatOver) {
                    callback({} as T);
                }
            });
            component.initCombatListeners();
            expect(component.combatInProgress).toBe(false);
        });

        it('should set onEvasion to true on EvasionSuccess event', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.EvasionSuccess) {
                    callback({ listPlayers: mockPlayers, player: mockPlayers[0] } as T);
                }
            });
            spyOn(component, 'setPlayersOnCombatDone');
            component.initCombatListeners();
            expect(component.setPlayersOnCombatDone).toHaveBeenCalledWith(mockPlayers);
            expect(combatServiceSpy.onEvasion).toHaveBeenCalledWith(mockPlayers[0]);
        });
    });

    it('should set isActivePlayer and isTurnStartShowed when isActive event is emitted', () => {
        mockSocket.id = '0';
        navigationServiceSpy.players = JSON.parse(JSON.stringify(mockPlayers));
        socketCommunicationServiceSpy.socket.id = mockPlayers[0].id;
        gameServiceSpy.isActivePlayer.and.returnValue(true);
        spyOn(component, 'initTimerEvents');
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.ActivePlayer) {
                callback(mockPlayers[0] as T);
            }
        });
        component.ngAfterViewInit();
        expect(component.isActivePlayer).toBeTrue();
        expect(component.isTurnStartShowed).toBeTrue();
        expect(component.initTimerEvents).toHaveBeenCalled();
    });

    describe('initTimerEvents', () => {
        it('should update timeRemainingBeforeStartTurn when beforeStartTurnTimer event is emitted', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.BeforeStartTurnTimer) {
                    callback(STARTING_TIME as T);
                }
            });
            component.initTimerEvents();
            expect(component.timeRemainingBeforeStartTurn).toBe(STARTING_TIME);
        });

        it('should update allPlayers and call onBeforeStartTurn when turnEnded event is emitted', () => {
            spyOn(component, 'onBeforeStartTurn');
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.TurnEnded) {
                    callback(mockPlayers as T);
                }
            });
            component.initTimerEvents();
            expect(component.allPlayers).toBe(mockPlayers);
            expect(component.onBeforeStartTurn).toHaveBeenCalled();
        });

        it('should call closeTurnStartPopUp and update timeRemainingStartTurn when startedTurnTimer event is emitted', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.StartedTurnTimer) {
                    callback(TURN_TIME as T);
                }
            });
            spyOn(component, 'closeTurnStartPopUp');
            component.initTimerEvents();
            expect(component.timeRemainingStartTurn).toBe(TURN_TIME);
        });
    });

    it('should update isChatFocus and call toggleDebugMode', () => {
        spyOn(component, 'toggleDebugMode');
        component.onChatFocus(true);

        expect(component['isChatFocus']).toBeTrue();
        expect(component.toggleDebugMode).toHaveBeenCalled();
    });

    it('should update isChatFocus to false and call toggleDebugMode', () => {
        spyOn(component, 'toggleDebugMode');
        component.onChatFocus(false);

        expect(component['isChatFocus']).toBeFalse();
        expect(component.toggleDebugMode).toHaveBeenCalled();
    });

    it('should reset action selections before start of turn and send startTurn', () => {
        component.activePlayer = mockPlayers[0];
        gameServiceSpy.isActionCombatSelected = true;
        gameServiceSpy.isActionDoorSelected = true;
        component.onBeforeStartTurn();
        expect(gameServiceSpy.isActionCombatSelected).toBeFalse();
        expect(gameServiceSpy.isActionDoorSelected).toBeFalse();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('startTurn');
    });

    it('should set allPlayers and action point', () => {
        component.setPlayersOnCombatDone(mockPlayers);
        expect(component.allPlayers).toEqual(mockPlayers);
    });

    describe('getPlayerCount', () => {
        it('should return the correct player count when allPlayers is defined and has players', () => {
            component.allPlayers = mockPlayers;
            const result = component.getPlayerCount();
            expect(result).toBe(mockPlayers.length);
        });

        it('should return 0 when there are no players', () => {
            component.allPlayers = [];
            const result = component.getPlayerCount();
            expect(result).toBe(0);
        });
    });

    it('should set map dimension text', () => {
        const mapSize = 10;
        gameCreationServiceSpy.updateDimensions.and.returnValue(mapSize);
        expect(component.findMapDimensions()).toEqual(`${mapSize} x ${mapSize}`);
    });

    it('should replenish health for all players', () => {
        expect(mockPlayer.attributes.currentHp).not.toEqual(mockPlayer.attributes.totalHp);
        component.replenishHealth();
        component.allPlayers.forEach((player) => {
            expect(player.attributes.currentHp).toEqual(player.attributes.totalHp);
        });
    });

    it('should set the id of the first pageDiv element to "enabled"', () => {
        const mockDivs = new QueryList<ElementRef<HTMLDivElement>>();
        const elementRef = new ElementRef(document.createElement('div'));
        mockDivs.reset([elementRef]);
        component.pageDiv = mockDivs;
        component.enableClicks();
        expect(component.pageDiv.first.nativeElement.id).toBe('enabled');
    });

    it('should call enableClicks when closeTurnStartPopUp is called', () => {
        spyOn(component, 'enableClicks');
        component.closeTurnStartPopUp();
        expect(component.enableClicks).toHaveBeenCalled();
        expect(component.beforeTurnTotalTime).toEqual(STARTING_TIME);
        expect(component.isTurnStartShowed).toBe(false);
        expect(component.activePlayerName).toBeNull();
    });

    it('should toggle isActionDoorSelected correctly', () => {
        component.toggleActionDoorSelected();
        expect(gameServiceSpy.toggleActionDoorSelected).toHaveBeenCalled();
    });

    it('should toggle isActionCombatSelected correctly', () => {
        component.toggleActionCombatSelected();
        expect(gameServiceSpy.toggleActionCombatSelected).toHaveBeenCalled();
    });

    it('should toggle debug mode when "d" is pressed, chat is not focused, and player is admin', () => {
        gameServiceSpy.isCurrentPlayerAdmin.and.returnValue(true);
        navigationServiceSpy.isDebugMode = false;
        const event = new KeyboardEvent('keydown', { key: 'd' });
        component['isChatFocus'] = false;

        component.toggleDebugMode();
        component['keyDownListener'](event);

        expect(navigationServiceSpy.isDebugMode).toBeTrue();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('debugMode', true);
    });

    it('should call handleExit of gameService', () => {
        component.handleExit();
        expect(gameServiceSpy.handleExit).toHaveBeenCalled();
    });

    it('should call hasActionsPoint of gameService', () => {
        gameServiceSpy.hasActionPoints.and.returnValue(true);
        const result = component.hasActionPoints();
        expect(result).toBe(true);
    });

    it('should send endTurn event', () => {
        component.onEndTurn();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.EndTurn);
    });

    it('should return allPlayers or -1', () => {
        component.allPlayers = mockPlayers;
        expect(component.getPlayerCount()).toEqual(mockPlayers.length);

        component.allPlayers = [];
        expect(component.getPlayerCount()).toEqual(0);
    });
});
