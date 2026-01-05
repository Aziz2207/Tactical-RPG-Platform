import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GameService } from '@app/services/sockets/game/game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';

import { SimpleDialogComponent } from '@app/components/simple-dialog/simple-dialog.component';
import { mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { mockRoom } from '@app/mocks/mock-room';
import { Player } from '@common/interfaces/player';
import { PathRoute } from '@common/interfaces/route';
import { of } from 'rxjs';
import { JoinGameService } from './join-game.service';

describe('JoinGameService', () => {
    let service: JoinGameService;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let routerSpy: jasmine.SpyObj<Router>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let code: string;
    let mockPlayer: Player;

    beforeEach(async () => {
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', [
            'send',
            'on',
            'once',
            'isSocketAlive',
            'connect',
            'disconnect',
        ]);
        gameServiceSpy = jasmine.createSpyObj('GameService', ['setRoomId']);
        code = '1234';
        mockPlayer = mockLobbyPlayers[0];

        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: routerSpy },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: MatDialog, useValue: dialogSpy },
            ],
        });
        service = TestBed.inject(JoinGameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call connect when socket is not alive', () => {
        service.connect();
        expect(socketCommunicationServiceSpy.connect).toHaveBeenCalled();
    });

    it('should setRoomId onJoinGame', () => {
        service.onJoinGame(mockRoom);
        expect(gameServiceSpy.setRoomId).toHaveBeenCalledWith(mockRoom.roomId);
        expect(gameServiceSpy.selectedGame).toBe(mockRoom.gameMap);
    });

    describe('getErrorMessage', () => {
        it('should return the correct error message for a valid error type', () => {
            const result = service.getErrorMessage('invalidFormat');
            expect(result).toBe('Le code doit être composé de 4 chiffres');
        });

        it('should return undefined for an invalid error type', () => {
            const result = service.getErrorMessage('test');
            expect(result).toBeUndefined();
        });

        it('should return undefined when no error type is provided', () => {
            const result = service.getErrorMessage();
            expect(result).toBeUndefined();
        });
    });

    it('should send isLocked and call onIsRoomLocked on joinLobby', () => {
        spyOn(service, 'onIsRoomLocked');
        socketCommunicationServiceSpy.once.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'isRoomLocked') {
                callback(true as T);
            }
        });

        service.joinLobby(mockPlayer);
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalled();
        expect(service.onIsRoomLocked).toHaveBeenCalled();
    });

    describe('handleJoinGame', () => {
        it('should send joinRoom and handle successful join', () => {
            const joinCallback = jasmine.createSpy('callback');

            socketCommunicationServiceSpy.on.and.callFake(<Room>(event: string, callback: (date: Room) => void) => {
                if (event === 'joinedRoom') {
                    callback(mockRoom as Room);
                }
            });

            spyOn(service, 'onJoinGame');
            service.handleJoinGame(code, joinCallback);

            expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('joinRoom', mockRoom.roomId);
            expect(service.onJoinGame).toHaveBeenCalledWith(mockRoom);
            expect(joinCallback).toHaveBeenCalled();
        });

        it('should set error message when room not found', () => {
            const joinCallback = jasmine.createSpy('callback');
            const errorMessage = 'A test error message';
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (date: T) => void) => {
                if (event === 'joinError') {
                    callback('roomNotFound' as unknown as T);
                }
            });
            spyOn(service, 'getErrorMessage').and.returnValue(errorMessage);

            service.handleJoinGame(code, joinCallback);
            expect(joinCallback).toHaveBeenCalled();
            expect(service.getErrorMessage).toHaveBeenCalled();
            expect(joinCallback).toHaveBeenCalledWith(null, errorMessage);
        });

        it('should set error message to empty string when getErrorMessage returns undefined', () => {
            const joinCallback = jasmine.createSpy('callback');
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'joinError') {
                    callback('roomNotFound' as unknown as T);
                }
            });

            spyOn(service, 'getErrorMessage').and.returnValue(undefined);
            service.handleJoinGame(code, joinCallback);

            expect(joinCallback).toHaveBeenCalled();
            expect(service.getErrorMessage).toHaveBeenCalledWith('roomNotFound');
            expect(joinCallback).toHaveBeenCalledWith(null, '');
        });
    });

    describe('onIsRoomLocked', () => {
        it('should navigate to /waiting-page when room is unlocked ', () => {
            spyOn(service, 'handleLockedRoom');
            const isLocked = false;
            service.onIsRoomLocked(mockPlayer, isLocked);

            expect(service.handleLockedRoom).not.toHaveBeenCalled();
            expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('createPlayer', mockLobbyPlayers[0]);
            expect(routerSpy.navigate).toHaveBeenCalled();
        });

        it('should call handleLockedRoom when room is locked ', () => {
            spyOn(service, 'handleLockedRoom');
            const isLocked = true;
            service.onIsRoomLocked(mockPlayer, isLocked);

            expect(service.handleLockedRoom).toHaveBeenCalled();
            expect(socketCommunicationServiceSpy.send).not.toHaveBeenCalledWith('createPlayer', mockLobbyPlayers[0]);
            expect(routerSpy.navigate).not.toHaveBeenCalled();
        });
    });

    it('should open a dialog and not send leave if result is not leave', () => {
        const dialogRefSpy = jasmine.createSpyObj('DialogRef', ['afterClosed']);
        dialogRefSpy.afterClosed.and.returnValue(of('stay'));
        dialogSpy.open.and.returnValue(dialogRefSpy);

        service.handleLockedRoom();
        expect(dialogSpy.open).toHaveBeenCalledWith(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: 'Partie verrouillée',
                messages: ['Veuillez réessayer plus tard ou retourner au menu principal '],
                options: ['Quitter', 'Rester'],
                confirm: true,
            },
        });
        expect(routerSpy.navigate).not.toHaveBeenCalledWith([PathRoute.Home]);
    });

    it('should open the dialog and navigate to /home if confirmed', () => {
        const dialogRefSpy = jasmine.createSpyObj('DialogRef', ['afterClosed']);
        dialogRefSpy.afterClosed.and.returnValue(of({ action: 'left' }));
        dialogSpy.open.and.returnValue(dialogRefSpy);

        service.handleLockedRoom();
        expect(dialogSpy.open).toHaveBeenCalledWith(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: 'Partie verrouillée',
                messages: ['Veuillez réessayer plus tard ou retourner au menu principal '],
                options: ['Quitter', 'Rester'],
                confirm: true,
            },
        });
        expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.Home]);
    });

    it('should return undefined if not a known error type', () => {
        const result = service.getErrorMessage('character');
        expect(result).toBeUndefined();
    });
});
