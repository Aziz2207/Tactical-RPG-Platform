import { GameSessionEvents } from '@common/event-enums/gameSession.gateway.events';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { ActionsService } from '../actions/actions.service';
import { VirtualPlayerService } from '../virtual-player/virtual-player.service';
import { RoomService } from './rooms.service';

describe('RoomService', () => {
    let service: RoomService;
    let socket: jest.Mocked<Socket>;
    let server: jest.Mocked<Server>;
    let virtualPlayerService: jest.Mocked<VirtualPlayerService>;
    let inventoryService: jest.Mocked<ActionsService>;

    beforeEach(async () => {
        virtualPlayerService = {
            generateVirtualPlayer: jest.fn(),
        } as unknown as jest.Mocked<VirtualPlayerService>;

        inventoryService = {
            checkForMystery: jest.fn(),
        } as unknown as jest.Mocked<ActionsService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoomService,
                { provide: VirtualPlayerService, useValue: virtualPlayerService },
                { provide: ActionsService, useValue: inventoryService },
            ],
        }).compile();

        service = module.get<RoomService>(RoomService);

        socket = {
            id: 'socket1',
            join: jest.fn(),
            emit: jest.fn(),
            leave: jest.fn(),
            in: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
        } as unknown as jest.Mocked<Socket>;

        server = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
            socketsLeave: jest.fn(),
        } as unknown as jest.Mocked<Server>;
    });

    it('should be created', () => {
        expect(service).toBeDefined();
    });

    describe('createRoom', () => {
        it('should create a room and make the socket join it if it does not exist', () => {
            const roomId = '1234';
            const map = { _size: 10 } as unknown as Map;
            service.createRoom(roomId, socket, map);

            expect(service['rooms']).toHaveLength(1);
            expect(service['rooms'][0].code).toEqual(roomId);
            expect(service['rooms'][0].maxPlayers).toEqual(2); // Map size 10 => 2 players
            expect(socket.join).toHaveBeenCalledWith(roomId);
            expect(socket.emit).toHaveBeenCalledWith(GameSessionEvents.CreateAck, service['rooms'][0]);
        });

        it('should emit failure event if room exists', () => {
            const roomId = '1234';
            service['rooms'].push({ code: roomId } as Room);

            service.createRoom(roomId, socket, {} as Map);

            expect(socket.emit).toHaveBeenCalledWith(GameSessionEvents.CreateFailed);
        });
    });

    describe('joinRoom', () => {
        it('should add the player to the room if it exists and is not locked', () => {
            const roomId = '1234';
            const room: Room = {
                code: roomId,
                players: [],
                maxPlayers: 6,
                isLocked: false,
                takenCharacters: [],
            } as Room;
            service['rooms'].push(room);

            service.joinRoom(roomId, socket);

            expect(room.players).toHaveLength(1);
            expect(socket.join).toHaveBeenCalledWith(roomId);
            expect(socket.emit).toHaveBeenCalledWith(GameSessionEvents.JoinAck, room);
        });

        it('should emit JoinFailed if the room does not exist', () => {
            service.joinRoom('invalidRoom', socket);

            expect(socket.emit).toHaveBeenCalledWith(GameSessionEvents.JoinFailed, 'La salle existe pas');
        });

        it('should emit JoinFailed if the room is locked or full', () => {
            const roomId = '1234';
            const room: Room = {
                code: roomId,
                players: [{ socketId: 'player1' }],
                maxPlayers: 1,
                isLocked: true,
            } as Room;
            service['rooms'].push(room);

            service.joinRoom(roomId, socket);

            expect(socket.emit).toHaveBeenCalledWith(GameSessionEvents.JoinFailed, 'La salle est verouillee');
        });
    });

    describe('leaveRoom', () => {
        it('should remove the player and emit PlayersUpdate', () => {
            const roomId = '1234';
            const room: Room = {
                code: roomId,
                players: [{ socketId: socket.id, isHost: false }],
                maxPlayers: 6,
                isLocked: false,
                takenCharacters: [],
            } as Room;
            service['rooms'].push(room);

            service.leaveRoom(roomId, socket, server);

            expect(room.players).toHaveLength(0);
            expect(server.socketsLeave).toHaveBeenCalledWith(roomId);
        });

        it('should destroy the room if the host leaves', () => {
            const roomId = '1234';
            const room: Room = {
                code: roomId,
                players: [{ socketId: socket.id, isHost: true }],
                maxPlayers: 6,
                isLocked: false,
                takenCharacters: [],
                isActive: false,
            } as Room;
            service['rooms'].push(room);

            const destroyRoomSpy = jest.spyOn(service, 'destroyRoom');
            service.leaveRoom(roomId, socket, server);

            expect(destroyRoomSpy).toHaveBeenCalledWith(roomId);
        });
    });

    describe('removePlayer', () => {
        it('should remove the player from the room and emit updates', () => {
            const roomId = '1234';
            const playerId = 'player1';
            const room: Room = {
                code: roomId,
                players: [{ socketId: playerId, isHost: false }],
                maxPlayers: 6,
                isLocked: false,
                takenCharacters: [],
            } as Room;
            service['rooms'].push(room);

            service.removePlayer(roomId, playerId, socket);

            expect(room.players).toHaveLength(0);
            expect(socket.in(roomId).emit).toHaveBeenCalledWith('takenCharactersUpdate', []);
        });
    });

    describe('updatePlayerInfo', () => {
        it('should update player info and emit playersUpdate', () => {
            const player: Player = {
                socketId: socket.id,
                userName: '',
                attributes: {},
                characterType: 'test',
            } as Player;
            const room: Room = {
                code: '1234',
                players: [player],
                maxPlayers: 6,
                isLocked: false,
                takenCharacters: [],
            } as Room;
            service['rooms'].push(room);

            service.updatePlayerInfo(player, socket);

            expect(socket.emit).toHaveBeenCalledWith('playersUpdate', room.players);
        });
    });

    describe('toggleRoomLock', () => {
        it('should toggle the room lock status and emit updates', () => {
            const roomId = '1234';
            const room: Room = {
                code: roomId,
                players: [],
                maxPlayers: 6,
                isLocked: false,
                takenCharacters: [],
            } as Room;
            service['rooms'].push(room);

            service.toggleRoomLock(roomId, true, socket);

            expect(room.isLocked).toBe(true);
            expect(socket.emit).toHaveBeenCalledWith('roomLockToggled', true);
            expect(socket.to(roomId).emit).toHaveBeenCalledWith('roomLockToggled', true);
        });
    });

    describe('getMaxPlayers', () => {
        it('should return correct max players based on map size', () => {
            expect(service.getMaxPlayers({ _size: 10 } as Map)).toBe(2);
            expect(service.getMaxPlayers({ _size: 15 } as Map)).toBe(4);
            expect(service.getMaxPlayers({ _size: 20 } as Map)).toBe(6);
        });
    });

    describe('generateRoomId', () => {
        it('should generate a unique 4-digit room ID', () => {
            jest.spyOn(service, 'checkRoomExists').mockReturnValueOnce(false);

            const roomId = service.generateRoomId();

            expect(roomId).toMatch(/^\d{4}$/);
            expect(service.checkRoomExists).toHaveBeenCalled();
        });
    });

    describe('RoomService Utility Methods', () => {
        let room: Room;
    
        beforeEach(() => {
            room = {
                code: '1234',
                players: [
                    { socketId: 'player1', userName: 'Player1', characterType: 'warrior' } as Player,
                    { socketId: 'player2', userName: 'Player2', characterType: 'mage' } as Player,
                ],
                maxPlayers: 4,
                isLocked: false,
                takenCharacters: ['warrior', 'mage'],
            } as Room;
    
            service['rooms'].push(room);
        });
    
        describe('getRoom', () => {
            it('should return the room if it exists', () => {
                const result = service.getRoom('1234');
                expect(result).toEqual(room);
            });
    
            it('should return undefined if the room does not exist', () => {
                const result = service.getRoom('5678');
                expect(result).toBeUndefined();
            });
        });
    
        describe('getRoomCodeBySocketId', () => {
            it('should return the room code for a given socket ID', () => {
                const result = service.getRoomCodeBySocketId('player1');
                expect(result).toBe('1234');
            });
    
            it('should return an empty string if the socket ID is not in any room', () => {
                const result = service.getRoomCodeBySocketId('nonexistentPlayer');
                expect(result).toBe('');
            });
        });
    
        describe('addVirtualPlayer', () => {
            beforeEach(() => {
                jest.spyOn(service, 'toggleRoomLock');
                jest.spyOn(virtualPlayerService, 'generateVirtualPlayer').mockImplementation(
                    (takenCharacters, existingNames, isAgressive) =>
                        ({
                            socketId: 'virtualPlayer1',
                            userName: 'VirtualPlayer',
                            characterType: 'archer',
                            isAgressive,
                        } as Player),
                );
            });
    
            it('should add a virtual player to the room', () => {
                service.addVirtualPlayer('1234', true, socket);
    
                expect(room.players).toHaveLength(3);
                expect(room.players[2]).toEqual(
                    expect.objectContaining({
                        socketId: 'virtualPlayer1',
                        userName: 'VirtualPlayer',
                        characterType: 'archer',
                        isAgressive: true,
                    }),
                );
                expect(room.takenCharacters).toContain('archer');
                expect(socket.emit).toHaveBeenCalledWith(GameSessionEvents.PlayersUpdate, room.players);
                expect(socket.to(room.code).emit).toHaveBeenCalledWith(GameSessionEvents.PlayersUpdate, room.players);
            });
    
            it('should lock the room if it becomes full', () => {
                room.takenCharacters = ['warrior', 'mage', 'archer'];
                room.players = [...room.players, { characterType: 'archer' } as Player];
    
                service.addVirtualPlayer('1234', false, socket);
    
                expect(service.toggleRoomLock).toHaveBeenCalledWith('1234', true, socket);
            });
        });
    });
});