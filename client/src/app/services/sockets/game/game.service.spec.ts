/* eslint max-lines: ["off"] */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-non-null-assertion */
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { SimpleDialogComponent } from '@app/components/simple-dialog/simple-dialog.component';
import { TemporaryDialogComponent } from '@app/components/temporary-dialog/temporary-dialog.component';
import {
    DialogMessages,
    DialogOptions,
    DialogResult,
    DialogTitle,
    INFO_DIALOG_TIME,
    MAX_PLAYER_LARGE_MAP,
    MAX_PLAYER_MEDIUM_MAP,
    MAX_PLAYER_SMALL_MAP,
    SIZE_LARGE_MAP,
    SIZE_MEDIUM_MAP,
    SIZE_SMALL_MAP,
    WARNING_TIME,
} from '@app/constants';
import { mockSmallGrid } from '@app/mocks/mock-map';
import { mockPlayers } from '@app/mocks/mock-players';
import { MOCK_COLUMN, MOCK_ROW } from '@app/mocks/mock-position';
import { mockRoom } from '@app/mocks/mock-room';
import { NavigationService } from '@app/services/navigation/navigation.service';
import { PostGameService } from '@app/services/post-game/post-game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { ObjectType } from '@common/avatars-info';
import { GridOperationsInfo } from '@common/interfaces/grid-operations-info';
import { Player, Status } from '@common/interfaces/player';
import { PathRoute } from '@common/interfaces/route';
import { gameObjects } from '@common/objects-info';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { of } from 'rxjs';
import { Socket } from 'socket.io-client';
import { GameService } from './game.service';

describe('GameService', () => {
    let mockSocket: Socket;
    let service: GameService;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let routerSpy: jasmine.SpyObj<Router>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<TemporaryDialogComponent>>;
    let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
    let postGameServiceSpy: jasmine.SpyObj<PostGameService>;

    beforeEach(() => {
        mockSocket = { data: { roomCode: '1234' }, id: 'player' } as unknown as Socket;
        navigationServiceSpy = jasmine.createSpyObj('NavigationService', ['isNeighbor', 'isInteractionPossible', 'isObject']);
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['off', 'send', 'on', 'once', 'disconnect']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        dialogRefSpy = jasmine.createSpyObj('TemporaryDialogComponent', ['afterClosed', 'close']);
        dialogRefSpy.afterClosed.and.returnValue(of(undefined));
        dialogSpy.open.and.returnValue(dialogRefSpy);
        postGameServiceSpy = jasmine.createSpyObj('PostGameService', ['transferRoomStats']);

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: Router, useValue: routerSpy },
                { provide: ActivatedRoute, useValue: { queryParams: of({ roomCode: '1234' }) } },
                { provide: NavigationService, useValue: navigationServiceSpy },
                { provide: PostGameService, useValue: postGameServiceSpy },
            ],
        });
        service = TestBed.inject(GameService);
        socketCommunicationServiceSpy.socket = mockSocket;
    });

    it('should set roomId correctly', () => {
        const roomId = mockRoom.roomId;
        service.setRoomId(roomId);
        expect(service.roomId).toBe(roomId);
    });

    it('should join a room and set roomId and selectedGame', () => {
        socketCommunicationServiceSpy.on.and.callFake(<Room>(event: string, callback: (roomInfo: Room) => void) => {
            if (event === 'joinedRoom') {
                callback(mockRoom as Room);
            }
        });
        service.joinRoom(mockRoom.roomId);

        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('joinRoom', mockRoom.roomId);
        expect(service.isJoined).toBeTruthy();
        expect(service.selectedGame).toBe(mockRoom.gameMap);
        expect(service.roomId).toBe(mockRoom.roomId);
    });

    describe('getPlayerNumber', () => {
        it('should return max players for small map', () => {
            const result = service.getPlayerNumber(SIZE_SMALL_MAP);
            expect(result).toEqual(MAX_PLAYER_SMALL_MAP);
        });

        it('should return max players for medium map', () => {
            const result = service.getPlayerNumber(SIZE_MEDIUM_MAP);
            expect(result).toEqual(MAX_PLAYER_MEDIUM_MAP);
        });

        it('should return max players for large map', () => {
            const result = service.getPlayerNumber(SIZE_LARGE_MAP);
            expect(result).toEqual(MAX_PLAYER_LARGE_MAP);
        });

        it('should throw an error for invalid height', () => {
            const invalidHeight = 5;
            expect(() => service.getPlayerNumber(invalidHeight)).toThrowError('Nombre de joueur invalide');
        });
    });

    it('should open a dialog and not send leave if result is not leave', () => {
        const dialogData = {
            title: 'Partie verrouillée',
            messages: ['Veuillez réessayer plus tard ou retourner au menu principal '],
            options: ['Quitter', 'Rester'],
            confirm: true,
        };
        const dialogRef = jasmine.createSpyObj('DialogRef', ['afterClosed']);
        dialogRef.afterClosed.and.returnValue(of(DialogOptions.Stay));
        dialogSpy.open.and.returnValue(dialogRef);

        service.openDialog(dialogData);
        expect(dialogSpy.open).toHaveBeenCalledWith(SimpleDialogComponent, {
            disableClose: true,
            data: dialogData,
        });
    });

    it('should open a dialog and not send leave if result is not leave', () => {
        const dialogData = {
            title: DialogTitle.EndFight,
            message: DialogMessages.EndFight,
            duration: WARNING_TIME,
        };
        const dialogRef = jasmine.createSpyObj('DialogRef', ['afterClosed']);
        dialogSpy.open.and.returnValue(dialogRef);

        service.openTempDialog(dialogData);
        expect(dialogSpy.open).toHaveBeenCalledWith(TemporaryDialogComponent, {
            disableClose: true,
            data: dialogData,
        });
    });

    it('should navigate when result is Close openAdminQuitDialog', (done) => {
        const message = 'message';
        const dialogRef = jasmine.createSpyObj('DialogRef', ['afterClosed']);
        dialogRef.afterClosed.and.returnValue(of(DialogResult.Close));
        dialogSpy.open.and.returnValue(dialogRef);

        service.openAdminQuitDialog(message);

        setTimeout(() => {
            expect(dialogSpy.open).toHaveBeenCalledWith(SimpleDialogComponent, {
                disableClose: true,
                data: {
                    title: DialogTitle.GameCanceled,
                    messages: [message],
                    confirm: false,
                    options: [DialogOptions.Close],
                },
            });
            expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.Home]);
            done();
        });
    });

    it('isActionSelected should return the correct attribute', () => {
        service.isActionDoorSelected = true;
        service.isActionCombatSelected = false;
        expect(service.isActionSelected()).toEqual(service.isActionDoorSelected);

        service.isActionDoorSelected = false;
        service.isActionCombatSelected = true;
        expect(service.isActionSelected()).toEqual(service.isActionCombatSelected);
    });

    it('should return the correct boolean depending on actionPoints for canOpenDoor', () => {
        const player = { ...mockPlayers[0] };
        player.attributes.actionPoints = 1;
        service.isActionDoorSelected = true;
        expect(service.canOpenDoor(player)).toBeTrue();

        player.attributes.actionPoints = 0;
        expect(service.canOpenDoor(player)).toBeFalse();

        player.attributes.actionPoints = 1;
        service.isActionDoorSelected = false;
        expect(service.canOpenDoor(player)).toBeFalse();
    });

    it('should return the correct boolean for canStartCombat', () => {
        const player = { ...mockPlayers[0] };
        player.attributes.actionPoints = 1;
        service.isActionCombatSelected = true;
        expect(service.canStartCombat(player)).toBeTrue();

        service.isActionCombatSelected = false;
        expect(service.canStartCombat(player)).toBeFalse();

        player.attributes.actionPoints = 0;
        service.isActionCombatSelected = true;
        expect(service.canStartCombat(player)).toBeFalse();
    });

    it('should call the correct function on handleTileClick', () => {
        const canOpenDoorSpy = spyOn(service, 'canOpenDoor');
        const canStartCombatSpy = spyOn(service, 'canStartCombat');
        canOpenDoorSpy.and.returnValue(true);
        const mockPlayer = { ...mockPlayers[0] };
        const position = { x: 0, y: 0 };
        const tiles = mockSmallGrid;
        expect(service.handleTileClick(position, mockPlayer, tiles)).toBeFalse();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.DoorAction, {
            clickedPosition: position,
            player: mockPlayer,
        });

        canOpenDoorSpy.and.returnValue(false);
        canStartCombatSpy.and.returnValue(true);
        expect(service.handleTileClick(position, mockPlayer, tiles)).toBeFalse();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.CombatAction, {
            clickedPosition: position,
            player: mockPlayer,
        });

        canStartCombatSpy.and.returnValue(false);
        navigationServiceSpy.isInteractionPossible.and.returnValue(false);
        expect(service.handleTileClick(position, mockPlayer, tiles)).toBeTrue();

        canOpenDoorSpy.and.returnValue(false);
        canStartCombatSpy.and.returnValue(false);
        navigationServiceSpy.isInteractionPossible.and.returnValue(true);
        expect(service.handleTileClick(position, mockPlayer, tiles)).toBeFalse();
    });

    it('should call the correct methods on handleFightAction', () => {
        navigationServiceSpy.players = mockPlayers;
        const info: GridOperationsInfo = {
            position: { x: 0, y: 0 },
            tiles: [
                [1, 1],
                [1, 1],
            ],
            objects: [
                [ObjectType.Hermes, 0],
                [ObjectType.Sandal, 0],
            ],
        };
        navigationServiceSpy.isNeighbor.and.returnValue(false);
        expect(service.handleFightAction(info, { ...mockPlayers[0] })).toEqual({ ...mockPlayers[0] });

        navigationServiceSpy.isNeighbor.and.returnValue(true);
        navigationServiceSpy.isObject.and.returnValue(false);
        service.handleFightAction(info, { ...mockPlayers[0] });
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalled();
    });

    it('should disconnect and navigate /home on drawGame event', () => {
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.DrawGame) {
                callback({} as T);
            }
        });
        service.handleDrawGame();

        expect(dialogSpy.open).toHaveBeenCalledWith(TemporaryDialogComponent, {
            disableClose: true,
            data: {
                title: DialogTitle.DrawGame,
                message: DialogMessages.DrawGame,
                duration: INFO_DIALOG_TIME,
            },
        });

        expect(socketCommunicationServiceSpy.disconnect).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should return true if player has action points', () => {
        const player = { attributes: { actionPoints: 1 } } as unknown as Player;
        expect(service.hasActionPoints(player)).toBeTrue();
    });

    it('should return false if player has no action points', () => {
        const player = JSON.parse(JSON.stringify(mockPlayers[0]));
        player.attributes.actionPoints = 0;
        expect(service.hasActionPoints(player)).toBeFalse();
    });

    it('should return true if action selected', () => {
        service.isActionDoorSelected = true;
        expect(service.isActionSelected()).toBe(true);
        service.isActionDoorSelected = false;
        service.isActionCombatSelected = true;
        expect(service.isActionSelected()).toBe(true);
    });

    it('should return false if action not selected', () => {
        service.isActionDoorSelected = false;
        service.isActionCombatSelected = false;
        expect(service.isActionSelected()).toBe(false);
    });

    it('should return true if is a target door', () => {
        spyOn(service, 'isTargetDoor').and.returnValue(true);
        expect(service.isTarget(MOCK_ROW, MOCK_COLUMN)).toBe(true);
    });

    it('should return true if is a target player ', () => {
        spyOn(service, 'isTargetDoor').and.returnValue(false);
        spyOn(service, 'isTargetPlayer').and.returnValue(true);
        expect(service.isTarget(MOCK_ROW, MOCK_COLUMN)).toBe(true);
    });

    it('should return false if not a target', () => {
        spyOn(service, 'isTargetDoor').and.returnValue(false);
        spyOn(service, 'isTargetPlayer').and.returnValue(false);
        expect(service.isTarget(MOCK_ROW, MOCK_COLUMN)).toBe(false);
    });

    it('should return false if action door is not selected', () => {
        service.isActionDoorSelected = false;
        expect(service.isTargetDoor(MOCK_ROW, MOCK_COLUMN)).toBe(false);
    });

    it('should return true if action door is selected', () => {
        service.doorsTarget = [{ x: MOCK_ROW, y: MOCK_COLUMN }];
        service.isActionDoorSelected = true;
        expect(service.isTargetDoor(MOCK_ROW, MOCK_COLUMN)).toBe(true);
    });

    it('should return false if action combat is not selected', () => {
        service.isActionCombatSelected = false;
        expect(service.isTargetPlayer(MOCK_ROW, MOCK_COLUMN)).toBe(false);
    });

    it('should return true if action combat is selected', () => {
        const player = { position: { x: MOCK_ROW, y: MOCK_COLUMN } } as Player;
        service.playersTarget = [player];
        service.isActionCombatSelected = true;
        expect(service.isTargetPlayer(MOCK_ROW, MOCK_COLUMN)).toBe(true);
    });

    it('handleEndGame should call the correct functions on EndGame event', () => {
        const data = { winner: { ...mockPlayers[0] }, room: mockRoom };
        socketCommunicationServiceSpy.once.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.EndGame) {
                callback(data as T);
            }
        });
        spyOn(service, 'openDialog').and.returnValue(of({ action: DialogResult.Close }));
        spyOn(service, 'removeGamePageListeners');
        service.handleEndGame();
        expect(service.removeGamePageListeners).toHaveBeenCalled();
        expect(postGameServiceSpy.transferRoomStats).toHaveBeenCalled();
        expect(service.openDialog).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.PostGame], { queryParams: { roomCode: data.room.roomId } });
    });

    it('should open the admin quit dialog on roomDeleted', () => {
        socketCommunicationServiceSpy.once.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.RoomDeleted) {
                callback('room deleted' as T);
            }
        });
        spyOn(service, 'openAdminQuitDialog');
        service.handleRoomDeleted();
        expect(service.openAdminQuitDialog).toHaveBeenCalled();
    });

    it('should call openplayerKickoutDialog on kickPlayer', () => {
        socketCommunicationServiceSpy.once.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.KickPlayer) {
                callback({} as T);
            }
        });
        spyOn(service, 'openPlayerKickoutDialog');
        service.handleKickPlayer();
        expect(service.openPlayerKickoutDialog).toHaveBeenCalled();
    });

    it('should send leave room if a player quits', () => {
        spyOn(service, 'openDialog').and.returnValue(of({ action: DialogResult.Left }));
        service.openPlayerQuitDialog(mockRoom.roomId);
        expect(service.openDialog).toHaveBeenCalled();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalled();
    });

    it('should send the LeaveRoom event when a player leaves the post game', () => {
        spyOn(service, 'openDialog').and.returnValue(of({ action: DialogResult.Left }));
        service.openQuitPostGameLobby(mockRoom.roomId);
        expect(service.openDialog).toHaveBeenCalled();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.LeaveRoom, mockRoom.roomId);
    });

    it('should call navigateToHome if the player gets kicked out', () => {
        spyOn(service, 'openDialog').and.returnValue(of({ action: DialogResult.Close }));
        spyOn(service, 'navigateToHome');
        service.openPlayerKickoutDialog();
        expect(service.openDialog).toHaveBeenCalled();
        expect(service.navigateToHome).toHaveBeenCalled();
    });

    it('should call the correct functions depending on isAdmin on LeftRoom event', () => {
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.LeftRoom) {
                callback(true as T);
            }
        });
        spyOn(service, 'navigateToHome');
        service.handleLeftRoom();
        expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.CreateGame]);

        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.LeftRoom) {
                callback(false as T);
            }
        });
        service.handleLeftRoom();
        expect(service.navigateToHome).toHaveBeenCalled();
    });

    it('should open the item switch modal', () => {
        const data = { activePlayer: { ...mockPlayers[0] }, foundItem: ObjectType.Trident };
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.OpenItemSwitchModal) {
                callback(data as T);
            }
        });
        const trident = gameObjects.find((items) => items.id === ObjectType.Trident);
        spyOn<any>(service, 'openSwitchItemDialog');
        service.handleOpenItemSwitchModal();
        expect(service['openSwitchItemDialog']).toHaveBeenCalledWith(data.activePlayer, trident!);
    });

    it('should open dialog for handleExit', () => {
        navigationServiceSpy.isDebugMode = true;
        spyOn(service, 'navigateToHome');
        spyOn(service, 'openDialog').and.returnValue(of({ action: DialogResult.Left }));
        const isCurrentPlayerAdminSpy = spyOn(service, 'isCurrentPlayerAdmin');
        isCurrentPlayerAdminSpy.and.returnValue(true);
        service.handleExit({ ...mockPlayers });
        expect(navigationServiceSpy.isDebugMode).toBeFalse();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.DebugMode, navigationServiceSpy.isDebugMode);
        expect(socketCommunicationServiceSpy.disconnect).toHaveBeenCalled();
        expect(service.navigateToHome).toHaveBeenCalled();

        isCurrentPlayerAdminSpy.and.returnValue(false);
        service.handleExit({ ...mockPlayers });
        expect(navigationServiceSpy.isDebugMode).toBeFalse();
        expect(socketCommunicationServiceSpy.disconnect).toHaveBeenCalled();
        expect(service.navigateToHome).toHaveBeenCalled();
    });

    it('should open dialog on playerFell and send the EndTurn event', () => {
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.PlayerFell) {
                callback({} as T);
            }
        });
        spyOn(service, 'openTempDialog').and.returnValue(of(null));
        service.handlePlayerFell();
        expect(service.openTempDialog).toHaveBeenCalledWith({ title: DialogTitle.EndTurn, message: DialogMessages.Fell, duration: INFO_DIALOG_TIME });
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.EndTurn);
    });

    it('should return true if player is active', () => {
        socketCommunicationServiceSpy.socket.id = '1';
        const player = { ...mockPlayers[0] };
        player.id = '1';
        expect(service.isActivePlayer(player)).toBeTrue();
    });

    it('should return false if the player is not active', () => {
        socketCommunicationServiceSpy.socket.id = '1';
        const player = { ...mockPlayers[0] };
        player.id = '2';
        expect(service.isActivePlayer(player)).toBeFalse();
    });

    it('should get the current player', () => {
        const players = mockPlayers;
        players[0].id = '1';
        socketCommunicationServiceSpy.socket.id = '1';
        expect(service.getCurrentPlayer(players)).toEqual(mockPlayers[0]);
    });

    it('should return true if currentPlayer is admin', () => {
        const players = mockPlayers;
        players[0].status = Status.Admin;
        spyOn(service, 'getCurrentPlayer').and.returnValue(mockPlayers[0]);
        expect(service.isCurrentPlayerAdmin(players)).toBeTrue();
    });

    it('should return false if currentPlayer is not admin', () => {
        spyOn(service, 'getCurrentPlayer').and.returnValue(undefined);
        expect(service.isCurrentPlayerAdmin(mockPlayers)).toBeFalse();
    });

    it('should turn oof all the listeners', () => {
        service.removeGamePageListeners();
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.ActivePlayer);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.AttackAround);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.BeforeStartTurnTimer);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.CombatEnd);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.DebugMode);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.DrawGame);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.DoorAround);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.DoorClicked);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.EndGame);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.EvasionSuccess);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.OpenItemSwitchModal);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.StartedTurnTimer);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.StartFight);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.TurnEnded);
    });

    it('should call the functions for the listeners', () => {
        spyOn(service, 'handleEndGame');
        spyOn(service, 'handleOpenItemSwitchModal');
        spyOn(service, 'handleDrawGame');
        spyOn(service, 'handlePlayerFell');
        service.addGamePageListeners();
        expect(service.handleEndGame).toHaveBeenCalled();
        expect(service.handleOpenItemSwitchModal).toHaveBeenCalled();
        expect(service.handleDrawGame).toHaveBeenCalled();
        expect(service.handlePlayerFell).toHaveBeenCalled();
    });

    it('should set doorAction and combatAction', () => {
        service.isActionDoorSelected = false;
        service.toggleActionDoorSelected();
        expect(service.isActionDoorSelected).toBeTrue();
        expect(service.isActionCombatSelected).toBeFalse();
    });

    it('toggleActionCombatSelected should set the attributes correctly', () => {
        service.isActionCombatSelected = false;
        service.toggleActionCombatSelected();
        expect(service.isActionCombatSelected).toBeTrue();
        expect(service.isActionDoorSelected).toBeFalse();
    });

    it('should send ItemSwapped after opening the dialog to swap items', () => {
        spyOn(service, 'openDialog').and.returnValue(of(null));
        service['openSwitchItemDialog']({ ...mockPlayers[0] }, gameObjects[0]);
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalled();
    });
});
