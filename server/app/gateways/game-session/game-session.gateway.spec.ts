import { ActiveSession } from '@app/interfaces/active-session';
import { ActiveSessionService } from '@app/services/active-session/active-session.service';
import { GameControllerService } from '@app/services/game-controller/game-controller.service';
import { RoomService } from '@app/services/rooms/rooms.service';
import { TurnService } from '@app/services/turn/turn.service';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { GameSessionGateway } from './game-session.gateway';

describe('GameSessionGateway', () => {
    let gateway: GameSessionGateway;
    let logger: jest.Mocked<Logger>;
    let socket: jest.Mocked<Socket>;
    let server: jest.Mocked<Server>;
    let roomService: jest.Mocked<RoomService>;
    let sessionService: jest.Mocked<ActiveSessionService>;
    let gameControllerService: jest.Mocked<GameControllerService>;
    let turnService: jest.Mocked<TurnService>;
    let playerTest: Player;

    beforeEach(async () => {
        logger = {
            log: jest.fn(),
        } as unknown as jest.Mocked<Logger>;

        socket = {
            id: 'socket-id',
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        } as unknown as jest.Mocked<Socket>;

        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        roomService = {
            generateRoomId: jest.fn().mockReturnValue('1234'),
            createRoom: jest.fn(),
            joinRoom: jest.fn(),
            leaveRoom: jest.fn(),
            updatePlayerInfo: jest.fn(),
            removePlayer: jest.fn(),
            toggleRoomLock: jest.fn(),
            addVirtualPlayer: jest.fn(),
            getRoomCodeBySocketId: jest.fn(),
            findPlayerBySocketId: jest.fn(),
        } as unknown as jest.Mocked<RoomService>;

        sessionService = {
            activeSessions: new Map(),
        } as unknown as jest.Mocked<ActiveSessionService>;

        gameControllerService = {
            handleDisconnectionCombat: jest.fn(),
            handleDisconnectionInventory: jest.fn(),
        } as unknown as jest.Mocked<GameControllerService>;

        turnService = {
            handlePlayerExit: jest.fn(),
        } as unknown as jest.Mocked<TurnService>;

        playerTest = {
            userName: 'Player1',
            isHost: true,
            socketId: socket.id,
            attributes: {
                speedPoints: 4,
                currentSpeed: 4,
                lifePoints: 4,
                offensePoints: 4,
                defensePoints: 4,
                diceChoice: 'attack',
                currentHP: 4,
                actionLeft: 1,
            },
            characterType: 'logiciel',
            nbWins: 0,
            hasActed: false,
        } as Player;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameSessionGateway,
                {
                    provide: Logger,
                    useValue: logger,
                },
                {
                    provide: RoomService,
                    useValue: roomService,
                },
                {
                    provide: ActiveSessionService,
                    useValue: sessionService,
                },
                {
                    provide: GameControllerService,
                    useValue: gameControllerService,
                },
                {
                    provide: TurnService,
                    useValue: turnService,
                },
            ],
        }).compile();

        gateway = module.get<GameSessionGateway>(GameSessionGateway);
        gateway['server'] = server; // Inject the server instance
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('createRoom', () => {
        it('should call roomService to create a room', () => {
            const map = {} as Map;
            gateway.createRoom(socket, map);

            expect(roomService.generateRoomId).toHaveBeenCalled();
            expect(roomService.createRoom).toHaveBeenCalledWith('1234', socket, map);
        });
    });

    describe('joinRoom', () => {
        it('should call roomService to join the room', () => {
            const roomId = '1234';
            gateway.joinRoom(socket, roomId);

            expect(roomService.joinRoom).toHaveBeenCalledWith(roomId, socket);
        });
    });

    describe('leaveRoom', () => {
        it('should call handleDisconnect when leaving a room', () => {
            const disconnectSpy = jest.spyOn(gateway, 'handleDisconnect').mockImplementation();
            gateway.leaveRoom(socket);

            expect(disconnectSpy).toHaveBeenCalledWith(socket);
        });
    });

    describe('updatePlayerInfo', () => {
        it('should call roomService to update player info', () => {
            gateway.updatePlayeInfo(socket, playerTest);

            expect(roomService.updatePlayerInfo).toHaveBeenCalledWith(playerTest, socket);
        });
    });

    describe('removePlayer', () => {
        it('should call roomService to remove a player from the room', () => {
            const data = { roomId: '1234', playerId: '5678' };
            gateway.removePlayer(socket, data);

            expect(roomService.removePlayer).toHaveBeenCalledWith(data.roomId, data.playerId, socket);
        });
    });

    describe('toggleRoomLock', () => {
        it('should call roomService to toggle room lock', () => {
            const data = { roomId: '1234', isLocked: true };
            gateway.toggleRoomLock(socket, data);

            expect(roomService.toggleRoomLock).toHaveBeenCalledWith(data.roomId, data.isLocked, socket);
        });
    });

    describe('addVirtualPlayer', () => {
        it('should call roomService to add a virtual player', () => {
            const data = { roomId: '1234', isAgressive: true };
            gateway.addVirtualPlayer(socket, data);

            expect(roomService.addVirtualPlayer).toHaveBeenCalledWith(data.roomId, data.isAgressive, socket);
        });
    });

    describe('handleConnection', () => {
        it('should log when a user connects', () => {
            gateway.handleConnection(socket);

            expect(logger.log).toHaveBeenCalledWith(`Connexion par l'utilisateur avec id : ${socket.id}`);
        });
    });

    describe('handleDisconnect', () => {
        it('should handle player disconnection and call appropriate services', () => {
            const roomCode = '1234';
            const session = { id: 'session1' } as unknown as ActiveSession;

            roomService.getRoomCodeBySocketId.mockReturnValue(roomCode);
            roomService.findPlayerBySocketId.mockReturnValue(playerTest);
            sessionService.activeSessions.set(roomCode, session);

            gateway.handleDisconnect(socket);

            expect(logger.log).toHaveBeenCalledWith(`Déconnexion par l'utilisateur avec id : ${socket.id}`);
            expect(roomService.getRoomCodeBySocketId).toHaveBeenCalledWith(socket.id);
            expect(roomService.findPlayerBySocketId).toHaveBeenCalledWith(roomCode, socket.id);
            expect(gameControllerService.handleDisconnectionCombat).toHaveBeenCalledWith(session, playerTest, server);
            expect(turnService.handlePlayerExit).toHaveBeenCalledWith(playerTest, session, server);
            expect(gameControllerService.handleDisconnectionInventory).toHaveBeenCalledWith(session, playerTest, server);
            expect(roomService.leaveRoom).toHaveBeenCalledWith(roomCode, socket, server);
        });

        it('should handle disconnect when no session or player is found', () => {
            roomService.getRoomCodeBySocketId.mockReturnValue(undefined);

            gateway.handleDisconnect(socket);

            expect(logger.log).toHaveBeenCalledWith(`Déconnexion par l'utilisateur avec id : ${socket.id}`);
            expect(roomService.getRoomCodeBySocketId).toHaveBeenCalledWith(socket.id);
            expect(roomService.leaveRoom).toHaveBeenCalled();
        });
    });
});
