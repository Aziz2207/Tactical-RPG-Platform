import { Stopwatch } from '@app/classes/stopwatch/stopwatch';
import { Timer } from '@app/classes/timer/timer';
import {
    DEFAULT_ACTION_POINT,
    DEFAULT_ATTRIBUTE,
    EQUAL_ODDS_FAIL,
    EQUAL_ODDS_SUCCESS,
    HIGH_ATTRIBUTE,
    MAX_ACTION_POINT,
    MOVEMENT_TIME,
    TURN_TIME,
} from '@app/constants';
import { InfoSwap } from '@app/interfaces/info-item-swap';
import { mockGlobalStats } from '@app/mocks/default-global-stats';
import { baseBot, mockAttributes, mockPlayerInventory, mockPlayers } from '@app/mocks/mock-players';
import { mockRoom, mockRooms } from '@app/mocks/mock-room';
import { mockServer } from '@app/mocks/mock-server';
import { BotService } from '@app/services/bot/bot.service';
import { GameLogsService } from '@app/services/game-logs/game-logs.service';
import { MatchService } from '@app/services/match/match.service';
import { PlayerInventoryService } from '@app/services/player-inventory/player-inventory.service';
import { RoomService } from '@app/services/room/room.service';
import { avatars, ObjectType } from '@common/avatars-info';
import { GameMode, TileCost, TileType } from '@common/constants';
import { Behavior, Player, Position, Status } from '@common/interfaces/player';
import { GameStatus, Room } from '@common/interfaces/room';
import { gameObjects } from '@common/objects-info';
import { ServerToClientEvent } from '@common/socket.events';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

/* eslint-disable max-lines */
describe('GameService', () => {
    let service: GameService;
    let mockSocket: Socket;
    let roomId: string;
    let roomService: RoomService;
    let gameLogsService: GameLogsService;
    let room: Room;
    let mockPlayer: Player;
    let listPlayers: Player[];
    let matchService: MatchService;
    let botService: BotService;
    let playerInventoryService: PlayerInventoryService;

    beforeEach(async () => {
        mockSocket = {
            emit: jest.fn(),
            data: { roomCode: '1234', username: 'the-user' },
            id: 'admin1234',
            rooms: new Set(['1234']),
            to: jest.fn().mockReturnThis(),
        } as unknown as Socket;

        listPlayers = [
            { id: 'player1', attributes: { speed: 10 }, status: Status.Player, isActive: true },
            { id: 'player2', attributes: { speed: 20 }, status: Status.Disconnected, isActive: false },
            { id: 'player3', attributes: { speed: 15 }, status: Status.Admin, isActive: false },
            { id: 'player4', attributes: { speed: 5 }, status: Status.Disconnected, isActive: false },
        ] as unknown as Player[];

        const playerInventoryServiceMock = {
            updateInventory: jest.fn(),
            determineRandomItem: jest.fn(),
            addStatsFromItem: jest.fn(),
            removeItemEffects: jest.fn(),
            updatePlayerWithItem: jest.fn(),
            updatePlayerAfterSwap: jest.fn(),
        };

        const gameLogsServiceMock = {
            createLog: jest.fn(),
            getGameLog: jest.fn(),
            sendDebugLog: jest.fn(),
            sendPlayerLog: jest.fn(),
        };
        const matchServiceMock = {
            processMapObjects: jest.fn(),
        };
        const roomServiceMock = {
            isRoomActive: jest.fn(),
            isPlayerAdmin: jest.fn(),
            getRoom: jest.fn(),
            deleteRoom: jest.fn(),
            leaveRoom: jest.fn(),
            getFightTimer: jest.fn().mockReturnValue({
                stopTimer: jest.fn(),
            }),
            getTurnTimer: jest.fn().mockReturnValue({
                stopTimer: jest.fn(),
            }),
            getServer: jest.fn().mockReturnValue(mockServer),
            joinRoom: jest.fn(),
            rooms: new Map([[roomId, room]]),
        };

        const botServiceMock = {
            processBotTurn: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameService,
                { provide: RoomService, useValue: roomServiceMock },
                { provide: GameLogsService, useValue: gameLogsServiceMock },
                { provide: MatchService, useValue: matchServiceMock },
                { provide: PlayerInventoryService, useValue: playerInventoryServiceMock },
                { provide: BotService, useValue: botServiceMock },
            ],
        }).compile();
        (mockServer.to as jest.Mock).mockReturnValue({ emit: jest.fn() });

        service = module.get<GameService>(GameService);
        roomService = module.get<RoomService>(RoomService);
        gameLogsService = module.get<GameLogsService>(GameLogsService);
        matchService = module.get<MatchService>(MatchService);
        botService = module.get<BotService>(BotService);
        playerInventoryService = module.get<PlayerInventoryService>(PlayerInventoryService);
        room = JSON.parse(JSON.stringify(mockRoom));
        roomId = room.roomId;
        mockPlayer = mockPlayers[0];
        room.listPlayers.push(mockPlayer);
        (roomService.getRoom as jest.Mock).mockReturnValue(room);

        service['io'] = mockServer;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should set isLocked on toggleLockRoom', () => {
        jest.spyOn(service, 'getRoomById').mockReturnValue(room);
        service.toggleLockRoom(roomId, true);

        expect(service.getRoomById).toHaveBeenCalledWith(roomId);
        expect(room.isLocked).toBe(true);
    });

    it('should return game when getRoomById is called', () => {
        roomService.rooms.set(roomId, room);
        const result = service.getRoomById(roomId);
        expect(result).toEqual(room);
    });

    describe('connectPlayerToGame', () => {
        it('should return an error if the room code format is invalid', () => {
            service['isCodeFormatValid'] = jest.fn().mockReturnValue(false);

            const code = 'test';
            const result = service['connectPlayerToGame'](code);

            expect(result).toEqual({ event: 'joinError', errorType: 'invalidFormat' });
            expect(service['isCodeFormatValid']).toHaveBeenCalledWith(code);
        });

        it('should return an error if the room is not active', () => {
            (roomService.isRoomActive as jest.Mock).mockReturnValue(false);
            roomService.rooms.set(roomId, room);
            const result = service['connectPlayerToGame'](roomId);

            expect(result).toEqual({ event: 'joinError', errorType: 'roomNotFound' });
            expect(roomService.isRoomActive).toHaveBeenCalledWith(roomId);
        });

        it('should return an error if the room is locked', () => {
            (roomService.isRoomActive as jest.Mock).mockReturnValue(true);
            room.isLocked = true;
            roomService.rooms.set(roomId, room);

            const result = service['connectPlayerToGame'](roomId);

            expect(result).toEqual({ event: 'joinError', errorType: 'roomLocked' });
            expect(roomService.isRoomActive).toHaveBeenCalledWith(roomId);
        });

        it('should return joinedRoom event if the room is active and not locked', () => {
            (roomService.isRoomActive as jest.Mock).mockReturnValue(true);
            room.isLocked = false;
            roomService.rooms.set(roomId, room);

            const result = service['connectPlayerToGame'](roomId);

            expect(result).toEqual({ event: 'joinedRoom' });
            expect(roomService.isRoomActive).toHaveBeenCalledWith(roomId);
        });
    });

    describe('handleCreatePlayer', () => {
        it('should create a player and emit updatedPlayer events', () => {
            service['setUniquePlayerName'] = jest.fn();
            service['getAvatarByName'] = jest.fn().mockReturnValue(avatars[0]);
            (roomService.isPlayerAdmin as jest.Mock).mockReturnValue(true);
            room.listPlayers.push(mockPlayer);

            service.handleCreatePlayer(room, mockPlayer, mockSocket);

            expect(roomService.isPlayerAdmin).toHaveBeenCalled();
            expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.UpdatedPlayer, room);
            expect(mockSocket.emit).toHaveBeenCalledWith(ServerToClientEvent.IsPlayerAdmin, true);
        });

        it('should create a player if not admin or bot', () => {
            service['setUniquePlayerName'] = jest.fn();
            service['getAvatarByName'] = jest.fn().mockReturnValue(avatars[0]);
            (roomService.getRoom as jest.Mock).mockReturnValue(room);
            (roomService.isPlayerAdmin as jest.Mock).mockReturnValue(false);
            room.listPlayers.push(mockPlayer);

            service.handleCreatePlayer(room, mockPlayer, mockSocket);

            expect(roomService.isPlayerAdmin).toHaveBeenCalled();
            expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.UpdatedPlayer, room);
            expect(mockSocket.emit).toHaveBeenCalledWith(ServerToClientEvent.IsPlayerAdmin, false);
        });
    });

    describe('leavePlayerFromGame', () => {
        it('should emit leftRoom and delete room if player is admin', () => {
            room.gameStatus = GameStatus.Lobby;
            service.getRoomById = jest.fn().mockReturnValue(room);
            gameLogsService.sendPlayerLog = jest.fn();
            (roomService.isPlayerAdmin as jest.Mock).mockReturnValue(true);
            service['removePlayerFromRoom'] = jest.fn();
            service.leavePlayerFromGame(roomId, mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith(ServerToClientEvent.LeftRoom, true);
            expect(roomService.deleteRoom).toHaveBeenCalledWith(roomId, mockSocket);
        });

        it('should emit leftRoom and update player if player is not admin', () => {
            service.getRoomById = jest.fn().mockReturnValue(room);
            (roomService.isPlayerAdmin as jest.Mock).mockReturnValue(false);
            service['removePlayerFromRoom'] = jest.fn();
            service.leavePlayerFromGame(roomId, mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith(ServerToClientEvent.LeftRoom, false);
            expect(service['removePlayerFromRoom']).toHaveBeenCalledWith(room, mockSocket);
        });

        it('should emit debugMode false when player is admin and room is in started mode', () => {
            service.getRoomById = jest.fn().mockReturnValue(room);
            service['handleStartedGameDisconnection'] = jest.fn();
            room.isDebug = true;
            room.gameStatus = GameStatus.Started;
            (roomService.isPlayerAdmin as jest.Mock).mockReturnValue(true);
            service.leavePlayerFromGame(roomId, mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith(ServerToClientEvent.LeftRoom, true);
            expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.DebugMode, false);
        });

        it('should emit UpdatePlayerList when leaving a started game', () => {
            service.getRoomById = jest.fn().mockReturnValue(room);
            const path = [{ x: 1, y: 2 }];
            service.getPlayerById = jest.fn().mockReturnValue(mockPlayers[0]);
            service.getActivePlayer = jest.fn().mockReturnValue(mockPlayers[1]);
            (roomService.isPlayerAdmin as jest.Mock).mockReturnValue(false);
            room.gameStatus = GameStatus.Started;
            service['handlePlayerDisconnection'] = jest.fn();
            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);

            service.leavePlayerFromGame(roomId, mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith(ServerToClientEvent.LeftRoom, false);
            expect(service['handlePlayerDisconnection']).toHaveBeenCalledWith(room, mockSocket);
            expect(mockSocket.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.UpdatePlayerList, room.listPlayers);
        });
    });

    it('should select an avatar and update the socket data on selectedAvatar', () => {
        const avatar = avatars[0];
        avatar.isTaken = false;
        service['getAvatarByName'] = jest.fn().mockReturnValue(avatar);
        service.selectedAvatar(room, avatar, mockSocket);

        expect(avatar.isTaken).toBe(true);

        expect(mockSocket.data.clickedAvatar).toBe(avatar);
    });

    it('should free up the previously selected avatar', () => {
        const clickedAvatar = avatars[0];
        clickedAvatar.isTaken = true;
        mockSocket.data.clickedAvatar = clickedAvatar;
        service['getAvatarByName'] = jest.fn().mockReturnValue(clickedAvatar);

        service['freeUpAvatar'](room, mockSocket);

        expect(service['getAvatarByName']).toHaveBeenCalledWith(room, clickedAvatar);
        expect(clickedAvatar.isTaken).toBe(false);
    });

    it('should not free up avatar if none is clicked', () => {
        service['freeUpAvatar'](room, mockSocket);
        expect(mockSocket.data.clickedAvatar).toBeUndefined();
    });

    it('should send customized avatar list to the client with correct isTaken and isSelected properties', () => {
        const clickedAvatar = avatars[0];
        const expectedAvatarList = avatars
            .filter((avatar) => avatar.name !== clickedAvatar.name)
            .map((avatar) => ({
                ...avatar,
                isSelected: false,
            }));
        mockSocket.data.clickedAvatar = clickedAvatar;

        service['sendAvatarListToClient'](mockSocket);

        expect(mockSocket.emit).toHaveBeenCalledWith(ServerToClientEvent.CharacterSelected, [
            {
                ...clickedAvatar,
                isTaken: false,
                isSelected: true,
            },
            ...expectedAvatarList,
        ]);
    });

    it('should send customized avatar list to the client if no clicked avatar', () => {
        const clickedAvatar = avatars[0];
        const expectedAvatarList = avatars
            .filter((avatar) => avatar.name !== clickedAvatar.name)
            .map((avatar) => ({
                ...avatar,
                isSelected: false,
            }));

        service['sendAvatarListToClient'](mockSocket);

        expect(mockSocket.emit).toHaveBeenCalledWith(ServerToClientEvent.CharacterSelected, [
            {
                ...clickedAvatar,
                isTaken: false,
                isSelected: false,
            },
            ...expectedAvatarList,
        ]);
    });

    it('should call sendAvatarListToClient for each connected socket', () => {
        service['sendAvatarListToClient'] = jest.fn().mockImplementation(() => {
            return avatars;
        });
        mockServer.sockets.sockets.set(mockSocket.id, mockSocket);
        service['updateAvatarsForAllClients'](roomId);

        expect(service['sendAvatarListToClient']).toHaveBeenCalledTimes(1);
    });

    it('should set an unique player name', () => {
        service['generateUniquePlayerName'] = jest.fn().mockReturnValue('uniqueName');
        service['setUniquePlayerName'](mockPlayer, mockSocket, true);
        expect(mockPlayer.name).toBe('uniqueName');
    });

    it('should return true if player name is taken', () => {
        const playersList: Player[] = [
            { name: 'player1', avatar: avatars[0], id: '1' } as Player,
            { name: 'player1-2', avatar: avatars[1], id: '2' } as Player,
        ];
        room.listPlayers = playersList;
        const result = service['isPlayerNameTaken']('player1', mockSocket);

        expect(result).toBe(true);
        expect(roomService.getRoom).toHaveBeenCalledWith(mockSocket);
    });

    it('should return the same name if it is unique', () => {
        const playerName = 'uniquePlayer';
        service['isPlayerNameTaken'] = jest.fn().mockReturnValue(false);
        const result = service['generateUniquePlayerName'](playerName, mockSocket);

        expect(result).toBe(playerName);
        expect(service['isPlayerNameTaken']).toHaveBeenCalledWith(playerName, mockSocket);
    });

    it('should return a name with suffix if the name is taken', () => {
        const playerName = 'player1';
        service['isPlayerNameTaken'] = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = service['generateUniquePlayerName'](playerName, mockSocket);

        expect(result).toBe('player1-2');
        expect(service['isPlayerNameTaken']).toHaveBeenCalledTimes(2);
        expect(service['isPlayerNameTaken']).toHaveBeenCalledWith(playerName, mockSocket);
        expect(service['isPlayerNameTaken']).toHaveBeenCalledWith('player1-2', mockSocket);
    });

    describe('isCodeFormatValid', () => {
        it('should be true if the code is 4 numbers', () => {
            expect(service['isCodeFormatValid'](roomId)).toBeTruthy();
        });

        it('should be false if the code is not composed of 4 numbers', () => {
            const roomCode = '12o4';
            expect(service['isCodeFormatValid'](roomCode)).toBeFalsy();
        });

        it('should be false if the code length is smaller than 4 numbers', () => {
            const roomCode = '123';
            expect(service['isCodeFormatValid'](roomCode)).toBeFalsy();
        });

        it('should be false if the code are not numbers', () => {
            const roomCode = 'pljd';
            expect(service['isCodeFormatValid'](roomCode)).toBeFalsy();
        });
    });

    it('should update the active player correctly', () => {
        room.listPlayers = mockPlayers;
        service['getPlayerConnectedInRoom'] = jest.fn().mockReturnValue(mockPlayers);
        service['removePlayerFromWall'] = jest.fn();
        service['playerInWall'] = jest.fn().mockReturnValue(true);
        service['updateActivePlayer'](mockRoom);
        expect(mockPlayers[0].isActive).toBe(false);
        expect(mockPlayers[1].isActive).toBe(true);
    });

    it('should return only connected players', () => {
        room.listPlayers = listPlayers;
        const connectedPlayers = service['getPlayerConnectedInRoom'](room);

        const expectedPlayers = [
            { id: 'player1', attributes: { speed: 10 }, status: Status.Player, isActive: true },
            { id: 'player3', attributes: { speed: 15 }, status: Status.Admin, isActive: false },
        ];
        expect(connectedPlayers).toEqual(expectedPlayers);
    });

    it('should return true if the player is active', () => {
        jest.spyOn(service, 'getPlayerById').mockReturnValue(listPlayers[0]);

        const isActive = service['isActivePlayer'](mockSocket);
        expect(isActive).toBe(true);
    });

    it('should return active player', () => {
        room.listPlayers = listPlayers;
        const activePlayer = service.getActivePlayer(room);
        expect(activePlayer).toBe(listPlayers[0]);
    });

    it('should return player by id', () => {
        room.listPlayers = mockPlayers;
        const player = service.getPlayerById(room, mockSocket);
        expect(player).toBe(mockPlayers[0]);
    });

    it('should stop both timers when no sockets are in the room', () => {
        mockServer.sockets.adapter.rooms.set(roomId, null);
        jest.spyOn(roomService, 'getFightTimer');
        jest.spyOn(roomService, 'getTurnTimer');

        service.stopGameTimers(room);

        expect(roomService.getFightTimer).toHaveBeenCalledWith(roomId);
        expect(roomService.getTurnTimer).toHaveBeenCalledWith(roomId);
    });

    it('should set active player and sort players onStartGame', () => {
        const listPlayersInactive = [
            { id: 'player1', attributes: { speed: 10 }, position: { x: 1, y: 1 }, status: Status.Player, isActive: false },
            { id: 'player2', attributes: { speed: 20 }, position: { x: 1, y: 0 }, status: Status.Player, isActive: false },
        ] as unknown as Player[];
        room.listPlayers = listPlayersInactive;
        service['emitStartGameEvents'] = jest.fn();
        jest.spyOn(matchService, 'processMapObjects');

        service['addUniqueTileToHistory'] = jest.fn();
        service['sortPlayersBySpeed'] = jest.fn();
        room.navigation.removeUnusedSpawnPoints = jest.fn();

        service.onStartGame(mockSocket);
        expect(room.gameStatus).toEqual(GameStatus.Started);
        expect(service['sortPlayersBySpeed']).toHaveBeenCalled();
        expect(room.listPlayers[0].isActive).toBe(true);
    });

    it('should update active player onTurnEnded', () => {
        const players = [
            { id: 'player1', attributes: { speed: 10 }, status: Status.Player, isActive: true },
            { id: 'player2', attributes: { speed: 20 }, status: Status.Player, isActive: false },
        ] as unknown as Player[];
        const mockTiles = [{ x: 0, y: 0 }];
        room.listPlayers = players;
        service['updateActivePlayer'] = jest.fn();
        jest.spyOn(service, 'getActivePlayer').mockReturnValue(players[0]);
        service['checkActions'] = jest.fn();

        room.navigation.findReachableTiles = jest.fn().mockReturnValue(mockTiles);
        service.onTurnEnded(room);

        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.Reachability, players[0]);
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.ActivePlayer, players[0]);
        expect(mockServer.to(players[0].id).emit).toHaveBeenCalledWith(ServerToClientEvent.TurnEnded);
        expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.UpdateVisual, room.listPlayers);
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.ReachableTiles, mockTiles);
    });

    it('should not update active player if moving', () => {
        service['isMoving'] = true;
        jest.spyOn(service, 'getActivePlayer').mockReturnValue(listPlayers[0]);
        service.onTurnEnded(room);
        expect(service['isTurnSkipped']).toBe(true);
    });

    it('should sort players by speed descending and move disconnected players to the end', () => {
        const player1 = { attributes: { speed: 10 }, status: Status.Disconnected } as unknown as Player;
        const player2 = { attributes: { speed: 15 }, status: Status.Player } as unknown as Player;
        const player3 = { attributes: { speed: 5 }, status: Status.Player } as unknown as Player;
        const player4 = { attributes: { speed: 20 }, status: Status.Player } as unknown as Player;

        room.listPlayers = [player1, player2, player3, player4];

        service['sortPlayersBySpeed'](room);

        expect(room.listPlayers).toEqual([player4, player2, player3, player1]);
    });

    it('should call onTurnEnded if the disconnected player is active', () => {
        const activePlayer = { id: 'active-player-id', isActive: true, status: Status.Player } as unknown as Player;
        service['isActivePlayer'] = jest.fn().mockReturnValue(true);
        jest.spyOn(service, 'onTurnEnded').mockImplementation();

        service['handleTurnAfterDisconnection'](room, mockSocket, activePlayer);

        expect(service.onTurnEnded).toHaveBeenCalledWith(room);
    });

    describe('handlePlayerDisconnection', () => {
        it('should mark player as disconnected and emit event', () => {
            const player = { id: 'player-id', status: Status.Player } as unknown as Player;
            room.listPlayers = [player];
            jest.spyOn(service, 'getPlayerById').mockReturnValue(player);
            jest.spyOn(service, 'emitEventToRoom');
            service['sortPlayersBySpeed'] = jest.fn();
            service['handleTurnAfterDisconnection'] = jest.fn();
            service.placeItemsOnGround = jest.fn();

            service['handlePlayerDisconnection'](room, mockSocket);

            expect(player.status).toBe(Status.Disconnected);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.PlayerDisconnected, player);
            expect(service['sortPlayersBySpeed']).toHaveBeenCalled();
            expect(service.getPlayerById).toHaveBeenCalled();
        });

        it('should emit draw if player is the last one in game', () => {
            const player = { id: 'player-id', status: Status.Player } as unknown as Player;
            jest.spyOn(service, 'getPlayerById').mockReturnValue(player);
            service['isLastPlayer'] = jest.fn().mockReturnValue(true);
            jest.spyOn(service, 'emitEventToRoom');
            service['handleTurnAfterDisconnection'] = jest.fn();
            service.placeItemsOnGround = jest.fn();

            service['handlePlayerDisconnection'](room, mockSocket);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.DrawGame);
        });
    });

    describe('playerTurnTimer', () => {
        it('should emit startedTurnTimer with remaining time', () => {
            const remainingTime = 5;
            const turnTimerCallback = jest.fn();
            const resetTimerMock = jest.fn((time, callback) => {
                turnTimerCallback.mockImplementation(callback);
            });
            const turnTimer = {
                resetTimer: resetTimerMock,
            } as unknown as Timer;

            jest.spyOn(roomService, 'getTurnTimer').mockReturnValue(turnTimer);
            jest.spyOn(service, 'onTurnEnded').mockImplementation();
            service['playerTurnTimer'](room);
            turnTimerCallback(remainingTime);

            expect(roomService.getTurnTimer).toHaveBeenCalledWith(room.roomId);
            expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.StartedTurnTimer, remainingTime);
            turnTimerCallback(0);
            expect(service.onTurnEnded).toHaveBeenCalledWith(room);
        });
    });

    describe('onStartTurn', () => {
        it('should start the turn timer and emit otherPlayerTurn', () => {
            const player = JSON.parse(JSON.stringify(listPlayers[2]));
            player.status = Status.Bot;
            const remainingTime = 5;
            const turnTimerCallback = jest.fn();
            const startTimerMock = jest.fn((time, callback) => {
                turnTimerCallback.mockImplementation(callback);
            });
            const turnTimer = {
                startTimer: startTimerMock,
            } as unknown as Timer;

            jest.spyOn(roomService, 'getTurnTimer').mockReturnValue(turnTimer);
            jest.spyOn(service, 'getActivePlayer').mockReturnValue(player);
            botService.processBotTurn = jest.fn();

            service['playerTurnTimer'] = jest.fn();

            service.onStartTurn(room);

            turnTimerCallback(remainingTime);
            expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.OtherPlayerTurn, player.name);
            expect(gameLogsService.sendPlayerLog).toHaveBeenCalled();
            expect(mockServer.to(player.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.BeforeStartTurnTimer, remainingTime);

            turnTimerCallback(0);
            expect(service['playerTurnTimer']).toHaveBeenCalledWith(room);
        });
    });

    describe('checkFell', () => {
        it('should return true if random value is greater than FALLING_PROBABILITY and debugMode is false', () => {
            const value = 0.4;
            jest.spyOn(Math, 'random').mockReturnValue(value);
            const result = service['checkFell']();
            expect(result).toBe(true);
        });
        it('should return false if random value is less than or equal to FALLING_PROBABILITY and debugMode is false', () => {
            service['isDebugMode'] = false;
            jest.spyOn(Math, 'random').mockReturnValue(0);
            const result = service['checkFell']();
            expect(result).toBe(false);
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });
    });

    it('should resolve after the specified delay', async () => {
        const ms = 100;
        const startTime = Date.now();
        await service['delay'](ms);
        const elapsedTime = Date.now() - startTime;

        expect(elapsedTime).toBeGreaterThanOrEqual(ms);
    });

    it('should return the corresponding cost for tile', () => {
        expect(service['getCost'](TileType.Ground, mockPlayers[0])).toBe(TileCost.Ground);
        expect(service['getCost'](TileType.Water, mockPlayers[0])).toBe(TileCost.Water);
        expect(service['getCost'](TileType.Ice, mockPlayers[0])).toBe(TileCost.Ice);
        expect(service['getCost'](TileType.OpenDoor, mockPlayers[0])).toBe(TileCost.OpenDoor);
        expect(service['getCost'](0, mockPlayers[0])).toBe(Infinity);
    });

    it('should return the corresponding cost for wall', () => {
        service['hasKuneeItem'] = jest.fn().mockReturnValue(true);
        expect(service['getCost'](TileType.Wall, mockPlayers[0])).toBe(TileCost.Ground);
        service['hasKuneeItem'] = jest.fn().mockReturnValue(false);
        expect(service['getCost'](TileType.Wall, mockPlayers[0])).toBe(Infinity);
    });

    describe('processNavigation', () => {
        let path;
        beforeEach(() => {
            path = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ];
            jest.spyOn(service, 'getActivePlayer').mockReturnValue(mockPlayers[0]);
            service['delay'] = jest.fn().mockResolvedValue(MOVEMENT_TIME);
            service.stopGameTimers = jest.fn();
            service.onTurnEnded = jest.fn();
            service['isTurnSkipped'] = true;
            service['getCost'] = jest.fn().mockReturnValue(1);
            service.emitEventToRoom = jest.fn();
            service['addUniqueTileToHistory'] = jest.fn();
        });

        it('should navigate and emit player navigation', async () => {
            service['checkFell'] = jest.fn().mockReturnValue(true);
            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);
            service['checkEndTurn'] = jest.fn().mockReturnValue(false);
            service['checkActions'] = jest.fn();
            service['isTurnSkipped'] = false;

            await service.processNavigation(room, path, mockSocket);

            expect(service.getActivePlayer).toHaveBeenCalledWith(room);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(roomId, ServerToClientEvent.PlayerNavigation, path[0]);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(roomId, ServerToClientEvent.PlayerNavigation, path[1]);
            expect(mockSocket.emit).not.toHaveBeenCalledWith(ServerToClientEvent.EndMovement);
        });

        it('should navigate and emit player navigation and fell', async () => {
            room.gameMap.tiles = [
                [0, 0],
                [TileType.Ice, 0],
            ];
            service['checkFell'] = jest.fn().mockReturnValue(false);
            service['checkEndTurn'] = jest.fn().mockReturnValue(false);
            service['handleFallingOnIce'] = jest.fn();
            service['checkActions'] = jest.fn();

            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);

            await service.processNavigation(room, path, mockSocket);

            expect(service.getActivePlayer).toHaveBeenCalledWith(room);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(roomId, ServerToClientEvent.PlayerNavigation, path[0]);
        });
        it('should navigate and end turn', async () => {
            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);
            service['checkEndTurn'] = jest.fn().mockReturnValue(true);
            service['addUniqueTileToHistory'] = jest.fn();
            await service.processNavigation(room, path, mockSocket);

            expect(service.getActivePlayer).toHaveBeenCalledWith(room);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(roomId, ServerToClientEvent.PlayerNavigation, path[0]);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(roomId, ServerToClientEvent.PlayerNavigation, path[1]);
            expect(mockSocket.emit).not.toHaveBeenCalledWith(ServerToClientEvent.PlayerFell);
        });
    });

    describe('processTeleportation', () => {
        let position;
        let server;

        beforeEach(() => {
            position = { x: 0, y: 1 };

            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            jest.spyOn(service, 'getActivePlayer').mockReturnValue(mockPlayers[0]);
            service['checkActions'] = jest.fn();

            room.navigation.findReachableTiles = jest.fn().mockReturnValue([{ x: 2, y: 2 }]);
        });

        it('should teleport the player and emit the correct events', () => {
            server.getActivePlayer = jest.fn().mockReturnValue(mockPlayers[0]);
            room.navigation.isTileValidTeleport = jest.fn().mockReturnValue(true);
            service.emitEventToRoom = jest.fn();
            mockRoom.gameMap.mode = GameMode.Classic;

            service.processTeleportation(room, position);
            expect(mockPlayers[0].position).toEqual(position);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.TeleportPlayer, {
                position,
                playerId: mockPlayers[0].id,
            });

            expect(room.navigation.findReachableTiles).toHaveBeenCalledWith(mockPlayers[0], room);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.ReachableTiles, [{ x: 2, y: 2 }]);
            expect(service.emitEventToRoom).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.EndMovement);
            expect(service['checkActions']).toHaveBeenCalledWith(room);
        });
    });

    describe('handleItemPickup', () => {
        it('should return true if tile is object', () => {
            service['isObject'] = jest.fn().mockReturnValue(true);
            playerInventoryService.updateInventory = jest.fn();
            const result = service['handleItemPickup'](room, mockSocket, mockPlayer, { x: 1, y: 1 });
            expect(result).toBe(true);
        });
    });

    describe('handleEndNavigation', () => {
        it('should return if turnSkipped is true', () => {
            room.navigation.findReachableTiles = jest.fn();
            service['checkEndTurn'] = jest.fn().mockReturnValue(false);
            service['isTurnSkipped'] = true;
            service['isPlayerFell'] = false;
            service['onTurnEnded'] = jest.fn();
            service['checkActions'] = jest.fn();

            service['handleEndNavigation'](room, mockPlayer, mockSocket);
            expect(service['onTurnEnded']).toHaveBeenCalledWith(room);
        });
    });

    it('should assign attack and defense stats based on random values', () => {
        const mockPlayerBot = mockPlayers[2];
        mockPlayerBot.attributes = mockAttributes;
        jest.spyOn(Math, 'random').mockReturnValueOnce(EQUAL_ODDS_SUCCESS).mockReturnValueOnce(EQUAL_ODDS_FAIL);

        const result = service['assignStatsToBot'](mockPlayerBot);
        expect(result.attributes.currentHp).toBe(HIGH_ATTRIBUTE);
        expect(result.attributes.speed).toBe(DEFAULT_ATTRIBUTE);
        expect(result.attributes.atkDiceMax).toBe(DEFAULT_ATTRIBUTE);
        expect(result.attributes.defDiceMax).toBe(HIGH_ATTRIBUTE);
    });

    it('should assign the opposite set of stats if random values are different', () => {
        const mockPlayerBot = mockPlayers[2];
        mockPlayerBot.attributes = mockAttributes;
        jest.spyOn(Math, 'random').mockReturnValueOnce(EQUAL_ODDS_FAIL).mockReturnValueOnce(EQUAL_ODDS_SUCCESS);

        const result = service['assignStatsToBot'](mockPlayerBot);
        expect(result.attributes.currentHp).toBe(DEFAULT_ATTRIBUTE);
        expect(result.attributes.speed).toBe(HIGH_ATTRIBUTE);
        expect(result.attributes.atkDiceMax).toBe(HIGH_ATTRIBUTE);
        expect(result.attributes.defDiceMax).toBe(DEFAULT_ATTRIBUTE);
    });

    it('should assign an available avatar to an aggressive bot and mark it as taken', () => {
        const behavior = Behavior.Aggressive;
        const result = service['assignAvatarToBot'](room, behavior);

        expect(result.avatar).toBeDefined();
        expect(result.avatar.isTaken).toBe(true);
        expect(result.name).toContain('-A-bot');

        const assignedAvatar = room.availableAvatars.find((avatar) => avatar.name === result.avatar.name);
        expect(assignedAvatar?.isTaken).toBe(true);
    });

    it('should assign an available avatar to a defensive bot and mark it as taken', () => {
        const behavior = Behavior.Defensive;
        const result = service['assignAvatarToBot'](room, behavior);

        expect(result.avatar).toBeDefined();
        expect(result.avatar.isTaken).toBe(true);
        expect(result.name).toContain('-D-bot');

        const assignedAvatar = room.availableAvatars.find((avatar) => avatar.name === result.avatar.name);
        expect(assignedAvatar?.isTaken).toBe(true);
    });

    it('should not assign an avatar if all are taken', () => {
        room.availableAvatars.forEach((avatar) => (avatar.isTaken = true));

        const behavior = Behavior.Defensive;
        const result = service['assignAvatarToBot'](room, behavior);

        expect(result.avatar).toEqual(avatars[0]);
        expect(room.availableAvatars.every((avatar) => avatar.isTaken)).toBe(true);
    });

    it('should send a message to the room when debugMode is changed', () => {
        const debugMode = true;
        service['handleDebugMode'](debugMode, mockSocket);
        expect(gameLogsService.sendDebugLog).toHaveBeenCalledWith(debugMode, room.roomId, mockServer);
    });

    describe('checkEndTurn', () => {
        let path;
        beforeEach(() => {
            path = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ];
            (roomService.getRoom as jest.Mock).mockReturnValue(room);
            service['isActivePlayer'] = jest.fn().mockReturnValue(true);
            room.listPlayers = mockPlayers;
        });
        it('should return early if no active player', () => {
            service['checkEndTurn'](mockSocket, undefined);
            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);
        });
        it('should return early if not active player', () => {
            service['isActivePlayer'] = jest.fn().mockReturnValue(false);
            service['checkEndTurn'](mockSocket, mockPlayer);
            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);
        });
        it('should return true when no reachable tiles and no actions', () => {
            room.navigation.findReachableTiles = jest.fn().mockReturnValue([]);
            room.navigation.haveActions = jest.fn().mockReturnValue(false);
            room.navigation.hasMovementPoints = jest.fn().mockReturnValue(true);

            const result = service['checkEndTurn'](mockSocket, mockPlayer);
            expect(result).toBe(true);
        });
        it('should return true when no movement points and no actions', () => {
            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);
            room.navigation.haveActions = jest.fn().mockReturnValue(false);
            room.navigation.hasMovementPoints = jest.fn().mockReturnValue(false);

            const result = service['checkEndTurn'](mockSocket, mockPlayer);
            expect(result).toBe(true);
        });

        it('should return true when no movement points and no actions points', () => {
            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);
            room.navigation.haveActions = jest.fn().mockReturnValue(true);
            room.navigation.hasMovementPoints = jest.fn().mockReturnValue(false);
            room.navigation.hasActionPoints = jest.fn().mockReturnValue(false);

            const result = service['checkEndTurn'](mockSocket, mockPlayer);
            expect(result).toBe(true);
        });
        it('should return true when no movement points and no actions points', () => {
            room.navigation.findReachableTiles = jest.fn().mockReturnValue(path);
            room.navigation.haveActions = jest.fn().mockReturnValue(true);
            room.navigation.hasMovementPoints = jest.fn().mockReturnValue(true);
            room.navigation.hasActionPoints = jest.fn().mockReturnValue(true);

            const result = service['checkEndTurn'](mockSocket, mockPlayer);
            expect(result).toBe(false);
        });
    });

    it('should create and assign a bot with an avatar and stats, then notify clients', () => {
        const behavior = Behavior.Aggressive;
        jest.spyOn(roomService, 'getRoom').mockReturnValue(room);
        service['assignAvatarToBot'] = jest.fn().mockReturnValue(avatars[0]);
        service['assignStatsToBot'] = jest.fn().mockReturnValue(baseBot);
        service['handleCreatePlayer'] = jest.fn();
        service['updateAvatarsForAllClients'] = jest.fn();

        service.createBot(behavior, mockSocket);

        expect(service['assignAvatarToBot']).toHaveBeenCalledWith(room, behavior);
        expect(service['assignStatsToBot']).toHaveBeenCalled();
        expect(service['handleCreatePlayer']).toHaveBeenCalledWith(room, baseBot, mockSocket);
        expect(service['updateAvatarsForAllClients']).toHaveBeenCalledWith(roomId);
        expect(roomService.getRoom).toHaveBeenCalledWith(mockSocket);
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.UpdatedPlayer, room);
    });

    it('should set navigation.isBot to true if the player is a bot', () => {
        const mockTiles = [{ x: 1, y: 1 }];
        service['isMoving'] = false;
        service['updateActivePlayer'] = jest.fn();
        service['checkActions'] = jest.fn();
        jest.spyOn(service, 'getActivePlayer').mockReturnValue(mockPlayers[2]);
        room.navigation.findReachableTiles = jest.fn().mockReturnValue(mockTiles);

        service.onTurnEnded(room);
        expect(room.navigation.isBot).toBeTruthy();
    });

    it('should set navigation.isBot to true if the player is a bot', () => {
        const mockTiles = [{ x: 1, y: 1 }];
        service['isMoving'] = false;
        service['updateActivePlayer'] = jest.fn();
        service['checkActions'] = jest.fn();
        jest.spyOn(service, 'getActivePlayer').mockReturnValue(mockPlayers[2]);
        room.navigation.findReachableTiles = jest.fn().mockReturnValue(mockTiles);

        service.onTurnEnded(room);
        expect(room.navigation.isBot).toBeTruthy();
    });

    it('should call removePlayerFromRoom on onKickPlayer', () => {
        mockServer.sockets.sockets.set(mockSocket.id, mockSocket);
        (roomService.getRoom as jest.Mock).mockReturnValue(room);
        service['removePlayerFromRoom'] = jest.fn();

        service.onKickPlayer(mockSocket, mockPlayer.id);

        expect(mockServer.to(mockPlayer.id).emit).toHaveBeenCalledWith(ServerToClientEvent.KickPlayer, mockPlayer.id);
        expect(service['removePlayerFromRoom']).toHaveBeenCalled();
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.UpdatedPlayer, room);
    });

    it('should kick a bot, update avatars, and notify clients', () => {
        const botRoom = mockRooms[2];
        const botId = 'bot';
        const botPlayer = botRoom.listPlayers.find((player) => player.id === botId);
        if (botPlayer) {
            botPlayer.avatar = avatars[0];
            botPlayer.avatar.isTaken = true;
        }
        jest.spyOn(roomService, 'getRoom').mockReturnValue(botRoom);
        service['updateAvatarsForAllClients'] = jest.fn();

        service.onKickBot(mockSocket, botId);

        expect(roomService.getRoom).toHaveBeenCalledWith(mockSocket);
        expect(botRoom.listPlayers).not.toContainEqual(expect.objectContaining({ id: botId }));
        expect(botRoom.listPlayers.find((player) => player.id === botId)).toBeUndefined();
        expect(mockServer.to(botId).emit).toHaveBeenCalledWith(ServerToClientEvent.KickPlayer, botId);
        expect(mockServer.to(botRoom.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.UpdatedPlayer, botRoom);
        expect(service['updateAvatarsForAllClients']).toHaveBeenCalledWith(botRoom.roomId);
    });

    it('should emit to client on emitStartGameEvents', () => {
        const mockTiles = [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
        ];
        (mockServer.to as jest.Mock).mockReturnValue({ emit: jest.fn() });
        service.getActivePlayer = jest.fn().mockReturnValue(mockPlayer);
        room.navigation.findReachableTiles = jest.fn().mockReturnValue(mockTiles);
        service['checkActions'] = jest.fn();

        service['emitStartGameEvents'](room);

        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.StartGame, room);
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.MapInformation, room);
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.ActivePlayer, mockPlayer);
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.ReachableTiles, mockTiles);
        expect(service['checkActions']).toHaveBeenCalled();
    });

    it('should call checkDoors and checkAttack around player', () => {
        service['checkDoors'] = jest.fn();
        service['checkAttack'] = jest.fn();

        service['checkActions'](room);
        expect(service['checkDoors']).toHaveBeenCalledWith(room);
        expect(service['checkAttack']).toHaveBeenCalledWith(room);
    });

    describe('checkAttack', () => {
        it('should emit attackAround true when attack is possible and player has action points', () => {
            room.navigation.checkAttack = jest.fn().mockReturnValue(true);
            service.getActivePlayer = jest.fn().mockReturnValue(mockPlayer);
            room.navigation.hasActionPoints = jest.fn().mockReturnValue(true);
            room.navigation.getNeighborPlayers = jest.fn().mockReturnValue([mockPlayer]);

            service['checkAttack'](room);

            expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.AttackAround, {
                attackAround: true,
                targets: [mockPlayer],
            });
        });

        it('should emit attackAround false when attack is not possible and player has action points', () => {
            room.navigation.checkAttack = jest.fn().mockReturnValue(false);
            service.getActivePlayer = jest.fn().mockReturnValue(mockPlayer);
            room.navigation.hasActionPoints = jest.fn().mockReturnValue(false);

            service['checkAttack'](room);

            expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.AttackAround, false);
        });
    });

    describe('checkDoors', () => {
        it('should emit doorAround true when door is around and player has action points', () => {
            room.navigation.checkDoor = jest.fn().mockReturnValue(true);
            service.getActivePlayer = jest.fn().mockReturnValue(mockPlayer);
            room.navigation.hasActionPoints = jest.fn().mockReturnValue(true);
            room.navigation.getNeighborDoors = jest.fn().mockReturnValue([{ x: 0, y: 0 }]);

            service['checkDoors'](room);

            expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.DoorAround, {
                doorAround: true,
                targets: [{ x: 0, y: 0 }],
            });
        });

        it('should emit doorAround false when door is not around and player has action points', () => {
            room.navigation.checkDoor = jest.fn().mockReturnValue(false);
            service.getActivePlayer = jest.fn().mockReturnValue(mockPlayer);
            room.navigation.hasActionPoints = jest.fn().mockReturnValue(false);

            service['checkDoors'](room);

            expect(mockServer.to(room.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.DoorAround, false);
        });
    });

    it('should handle door if a closed door is clicked', () => {
        const mockTiles = [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
        ];
        const doorActionData = { clickedPosition: { x: 1, y: 1 }, player: mockPlayer };
        (roomService.getRoom as jest.Mock).mockReturnValue(room);
        room.navigation.hasHandleDoorAction = jest.fn().mockReturnValue(true);
        room.navigation.findReachableTiles = jest.fn().mockReturnValue(mockTiles);
        service.getActivePlayer = jest.fn().mockReturnValue(mockPlayer);
        service['checkEndTurn'] = jest.fn().mockReturnValue(true);
        service.onTurnEnded = jest.fn();
        gameLogsService.sendDoorLog = jest.fn();

        service.handleDoor(mockSocket, doorActionData);

        expect(gameLogsService.sendDoorLog).toHaveBeenCalled();
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.DoorClicked, room.navigation.gameMap.tiles);
        expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.ReachableTiles, mockTiles);
        expect(service.onTurnEnded).toHaveBeenCalled();
    });

    it('should reset globalPostGameStats in the room', () => {
        room.globalPostGameStats = mockGlobalStats;
        service['resetGlobalStats'](room);
        expect(room.globalPostGameStats.globalTilesVisited).toEqual([]);
        expect(room.globalPostGameStats.doorsInteracted).toEqual([]);
        expect(room.globalPostGameStats.turns).toBe(1);
        expect(room.globalPostGameStats.nbFlagBearers).toBe(0);
        expect(room.globalPostGameStats.gameDuration).toBe('');
    });

    it('should handle end of the game correctly', () => {
        const mockWinner = mockPlayers[0];
        room.stopwatch = {
            stop: jest.fn(),
            getTime: jest.fn().mockReturnValue('15:32'),
        } as unknown as Stopwatch;

        service['resetGlobalStats'] = jest.fn();
        jest.spyOn(service, 'stopGameTimers');

        service.onEndGame(mockWinner, room);

        expect(room.gameStatus).toBe(GameStatus.Ended);
        expect(room.stopwatch.stop).toHaveBeenCalled();
        expect(mockServer.to).toHaveBeenCalledWith(room.roomId);

        expect(service['resetGlobalStats']).toHaveBeenCalledWith(room);
        expect(service.stopGameTimers).toHaveBeenCalledWith(room);
    });

    describe('addUniqueTileToHistory', () => {
        it('should add a tile to the position list if it does not already exist', () => {
            const positionList = [{ x: 0, y: 0 }];
            const newTile = { x: 1, y: 1 };
            service['addUniqueTileToHistory'](positionList, newTile);

            expect(positionList).toContainEqual(newTile);
            expect(positionList.length).toBe(2);
        });

        it('should not add a tile if a matching position already exists', () => {
            const positionList = [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
            ];
            const duplicateTile = { x: 1, y: 1 };

            service['addUniqueTileToHistory'](positionList, duplicateTile);

            expect(positionList).toContainEqual(duplicateTile);
            expect(positionList.length).toBe(2);
        });

        it('should handle an empty position list and add the tile', () => {
            const positionList: Position[] = [];
            const newTile = { x: 1, y: 2 };

            service['addUniqueTileToHistory'](positionList, newTile);

            expect(positionList).toContainEqual(newTile);
            expect(positionList.length).toBe(1);
        });
    });

    it('should end the game if the player is on his spawn with the flag on capture the flag mode', () => {
        const player = mockPlayerInventory[0];
        player.position = player.spawnPosition;
        service.onEndGame = jest.fn();
        gameLogsService.sendEndGameLog = jest.fn();

        service['checkFlagModeEndGame'](player, room);

        expect(service.onEndGame).toHaveBeenCalledWith(player, room);
        expect(gameLogsService.sendEndGameLog).toHaveBeenCalledWith(room.listPlayers, room.roomId, mockServer);
    });

    it('should end the game if the player is on his spawn with the flag on capture the flag mode', () => {
        const player = mockPlayerInventory[0];
        player.position = player.spawnPosition;
        service.onEndGame = jest.fn();
        gameLogsService.sendEndGameLog = jest.fn();

        service['checkFlagModeEndGame'](player, room);

        expect(service.onEndGame).toHaveBeenCalledWith(player, room);
        expect(gameLogsService.sendEndGameLog).toHaveBeenCalledWith(room.listPlayers, room.roomId, mockServer);
    });

    describe('handleJoinGame', () => {
        beforeEach(() => {
            roomService.rooms.set(roomId, mockRooms[0]);
            jest.spyOn(roomService, 'joinRoom');
        });
        it('should leave room if connectionRes has errorType roomNotFound', () => {
            const connectionRes = { event: 'joinError', errorType: 'roomNotFound' };
            service['connectPlayerToGame'] = jest.fn().mockReturnValue(connectionRes);
            service.handleJoinGame(mockSocket, roomId);

            expect(mockSocket.emit).toHaveBeenCalledWith(connectionRes.event, connectionRes.errorType);
        });

        it('should leave room if connectionRes has errorType roomLocked', () => {
            const connectionRes = { event: 'joinError', errorType: 'roomLocked' };
            service['connectPlayerToGame'] = jest.fn().mockReturnValue(connectionRes);
            service.handleJoinGame(mockSocket, roomId);

            expect(mockSocket.emit).toHaveBeenCalledWith(connectionRes.event, connectionRes.errorType);
        });

        it('should join the room successfully when there is no error', () => {
            const connectionRes = { event: 'joinedRoom' };
            service['connectPlayerToGame'] = jest.fn().mockReturnValue(connectionRes);
            service.handleJoinGame(mockSocket, roomId);

            expect(mockSocket.emit).toHaveBeenCalledWith(connectionRes.event, mockRooms[0]);
            expect(roomService.joinRoom).toHaveBeenCalledWith(mockSocket, roomId);
        });
    });

    it('should return the server from roomService', () => {
        const result = service.getServer();
        expect(roomService.getServer).toHaveBeenCalled();
        expect(result).toBe(mockServer);
    });

    it('should call onTurnEnded if time remaining is 0 or less', () => {
        jest.useFakeTimers();
        const player = JSON.parse(JSON.stringify(mockPlayers[0]));
        const infoSwap: InfoSwap = { server: mockServer, client: mockSocket };
        playerInventoryService.updatePlayerAfterSwap = jest.fn().mockReturnValue(player);

        service.getTurnTimer = jest.fn().mockReturnValue({
            resumeTimer: jest.fn((callback: (timeRemaining: number) => void) => {
                callback(0);
            }),
        } as unknown as Timer);
        service.onTurnEnded = jest.fn();

        service.startItemSwap(infoSwap);
        jest.advanceTimersByTime(TURN_TIME);

        expect(service.onTurnEnded).toHaveBeenCalledWith(room);
    });

    it('should remove player from room', () => {
        service['freeUpAvatar'] = jest.fn();
        service['updateAvatarsForAllClients'] = jest.fn();
        roomService.leaveRoom = jest.fn();

        service['removePlayerFromRoom'](room, mockSocket);
        expect(service['freeUpAvatar']).toHaveBeenCalledWith(room, mockSocket);
        expect(service['updateAvatarsForAllClients']).toHaveBeenCalledWith(room.roomId);
    });

    it('should remove player from wall', () => {
        const destination = { x: 1, y: 1 };
        room.navigation.movePlayerFromWall = jest.fn().mockReturnValue(destination);
        room.navigation.findFastestPath = jest.fn();
        service['processTeleportation'] = jest.fn();

        service['removePlayerFromWall'](room, mockPlayer);
        expect(service['processTeleportation']).toHaveBeenCalled();
    });

    it('should return object if player has kunee', () => {
        const player = { inventory: [gameObjects[ObjectType.Kunee - 1]] } as Player;
        expect(service['hasKuneeItem'](player)).toBeDefined();
    });

    it('should return avatar if available', () => {
        expect(service['getAvatarByName'](room, avatars[0])).toBeDefined();
    });

    it('should addActionPoints if has trident', () => {
        const player = {
            inventory: [gameObjects[ObjectType.Trident - 1]],
            attributes: { actionPoints: DEFAULT_ACTION_POINT, maxActionPoints: DEFAULT_ACTION_POINT },
        } as Player;
        service['addActionPoints'](player);
        expect(player.attributes.maxActionPoints).toBe(MAX_ACTION_POINT);
    });

    it('should update action point to default', () => {
        const player = {
            inventory: [gameObjects[ObjectType.Trident - 1]],
            attributes: { actionPoints: MAX_ACTION_POINT },
        } as Player;
        service['updateTridentEffect'](player);
        expect(player.attributes.actionPoints).toBe(DEFAULT_ACTION_POINT);
    });

    it('should return true if player in wall', () => {
        const player = { position: { x: 0, y: 0 } } as Player;
        room.gameMap.tiles = [[TileType.Wall]];
        const result = service['playerInWall'](room, player);
        expect(result).toBe(true);
    });

    describe('handleFallingOnIce', () => {
        it('should stop game timer if player not a bot', () => {
            room.navigation.isBot = false;
            service['stopGameTimers'] = jest.fn();
            service['handleFallingOnIce'](room, mockSocket);
        });

        it('should end turn if player is a bot', () => {
            room.navigation.isBot = true;
            service['onTurnEnded'] = jest.fn();
            service['delay'] = jest.fn();
            service['handleFallingOnIce'](room, mockSocket);
        });
    });

    it('should return true if is object', () => {
        const tile = { x: 0, y: 0 };
        room.gameMap.itemPlacement = [[ObjectType.Sandal]];
        const result = service['isObject'](room, tile);
        expect(result).toBe(true);
    });

    describe('placeItemsOnGround', () => {
        it('should return if no object in inventory', () => {
            const player = { id: 'empty', inventory: [] } as Player;
            room.listPlayers = [player];
            service.placeItemsOnGround(room, player);
        });
        it('should place item on ground', () => {
            room.navigation.findClosestValidTile = jest.fn().mockReturnValue({ x: 0, y: 1 });
            playerInventoryService.restoreInitialStats = jest.fn();
            const player = { position: { x: 0, y: 0 }, inventory: [gameObjects[0]] } as Player;
            room.listPlayers = [player];

            service.placeItemsOnGround(room, player);
        });
    });

    it('should return if no real player is left in room', () => {
        room.navigation.findReachableTiles = jest.fn();
        const bot = { status: Status.Bot } as Player;
        room.listPlayers = [bot];
        service['emitEventsOnTurnEnded'](room, mockPlayer);
        expect(room.navigation.findReachableTiles).not.toHaveBeenCalled();
    });
});
