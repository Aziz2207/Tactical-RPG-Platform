import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { GameSessionEvents } from '@common/event-enums/gameSession.gateway.events';
import { Attributes } from '@common/interfaces/attributes';
import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { ModeEnum } from '@common/mode-enum';
//import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';

type SpySocketService = {
    isSocketAlive: jasmine.Spy;
    on: jasmine.Spy<(event: string, action: (data?: unknown) => void) => void>;
    send: jasmine.Spy;
    connect: jasmine.Spy;
    disconnect: jasmine.Spy;
    getId: jasmine.Spy<() => string>;
};

describe('RoomManagerService', () => {
    let service: RoomManagerService;
    let socketServiceMock: SpySocketService;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockAttributes: Attributes = {
        speedPoints: 4,
        lifePoints: 8,
        offensePoints: 8,
        defensePoints: 4,
        currentSpeed: 4,
        currentHP: 4,
        diceChoice: 'attack',
        actionLeft: 4,
    };
    const mockPlayer: Player = {
        isHost: true,
        socketId: '1234',
        userName: 'Player1',
        attributes: mockAttributes,
        characterType: 'logiciel',
        nbWins: 0,
        hasActed: false,
        inventory: [],
        hasFlag: true,
    };

    const mockRoom: Room = {
        code: '1234',
        players: [mockPlayer],
        isLocked: true,
        maxPlayers: 4,
        takenCharacters: [],
        isActive: false,
        map: {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        },
    };

    beforeEach(() => {
        socketServiceMock = jasmine.createSpyObj('SocketService', [
            'isSocketAlive',
            'on',
            'send',
            'connect',
            'disconnect',
            'getId',
        ]) as SpySocketService;
        socketServiceMock.getId.and.returnValue('1234');
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            providers: [{ provide: SocketService, useValue: socketServiceMock }, { provide: Router, useValue: routerSpy }, provideRouter([])],
        });
        service = TestBed.inject(RoomManagerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should not join a game if the roomId is invalid', async () => {
        const mockId = 'AB12';
        await expectAsync(service.joinRoom(mockId)).toBeRejectedWith('Le code est invalide, entrez un code de 4 chiffres');
        expect(socketServiceMock.send).not.toHaveBeenCalled();
    });

    it('should allow the host to toggle room lock', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        service.room = { ...mockRoom, isLocked: true };
        service.player = mockPlayer;

        service.toogleRoomLock();

        expect(socketServiceMock.send).toHaveBeenCalledWith(GameSessionEvents.ToggeLock, { roomId: '1234', isLocked: false });
    });

    it('should not toggle room lock if player is not host', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        service.room = { ...mockRoom, isLocked: false };
        service.player = { ...mockPlayer, isHost: false };

        service.toogleRoomLock();

        expect(socketServiceMock.send).not.toHaveBeenCalled();
    });

    it('should not toggle room lock if socket is not alive', () => {
        socketServiceMock.isSocketAlive.and.returnValue(false);
        service.room = { ...mockRoom, isLocked: false };
        service.player = mockPlayer;

        service.toogleRoomLock();

        expect(socketServiceMock.send).not.toHaveBeenCalled();
    });

    it('should allow host to remove a player', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        service.room = mockRoom;
        service.player = mockPlayer;

        service.removePlayer('5678');

        expect(socketServiceMock.send).toHaveBeenCalledWith(GameSessionEvents.RemovePlayer, { roomId: '1234', playerId: '5678' });
    });

    it('should not remove player if player is not host', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        service.room = mockRoom;
        service.player = { ...mockPlayer, isHost: false };

        service.removePlayer('5678');

        expect(socketServiceMock.send).not.toHaveBeenCalled();
    });

    it('should not remove player if socket is not alive', () => {
        socketServiceMock.isSocketAlive.and.returnValue(false);
        service.room = mockRoom;
        service.player = mockPlayer;

        service.removePlayer('5678');

        expect(socketServiceMock.send).not.toHaveBeenCalled();
    });

    it('should leave a room and disconnect the socket', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        service.room = mockRoom;

        service.leaveRoom();

        expect(socketServiceMock.send).toHaveBeenCalledWith(GameSessionEvents.LeaveRoom, '1234');
        expect(socketServiceMock.disconnect).toHaveBeenCalled();
    });

    it('should not send leaveRoom or disconnect if room is undefined', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        service.room = mockRoom;

        service.leaveRoom();

        expect(socketServiceMock.send).toHaveBeenCalled();
        expect(socketServiceMock.disconnect).toHaveBeenCalled();
    });

    it('should not send leaveRoom or disconnect if socket is not alive', () => {
        socketServiceMock.isSocketAlive.and.returnValue(false);
        service.room = mockRoom;

        service.leaveRoom();

        expect(socketServiceMock.send).not.toHaveBeenCalled();
        expect(socketServiceMock.disconnect).not.toHaveBeenCalled();
    });

    it('should return the room when getRoom is called', () => {
        service.room = mockRoom;

        const result = service.getRoom();
        expect(result).toBe(mockRoom);
    });

    it('should return the map of the room when getMap is called', () => {
        service.room = mockRoom;

        const result = service.getMap();
        expect(result).toBe(mockRoom.map);
    });

    it('should create a room and set the player as host', async () => {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };
        const createdRoom = { ...mockRoom };

        socketServiceMock.connect.and.callFake(() => {
            return true;
        });
        socketServiceMock.send.and.callFake(() => {
            return true;
        });
        socketServiceMock.on.and.callFake((event: string, action: (data?: unknown) => void) => {
            if (event === GameSessionEvents.CreateAck) action(createdRoom);
        });

        await service.createRoom(mockMap);
        expect(service.room).toBe(createdRoom);
        expect(service.player).toEqual(jasmine.objectContaining({ isHost: true, socketId: '1234' }));
    });

    it('should handle create room failure', async () => {
        socketServiceMock.connect.and.callFake(() => {
            return true;
        });
        socketServiceMock.send.and.callFake(() => {
            return true;
        });
        socketServiceMock.on.and.callFake((event: string, action: (data?: unknown) => void) => {
            if (event === GameSessionEvents.CreateFailed) action(undefined);
        });

        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };

        await expectAsync(service.createRoom(mockMap)).toBeRejectedWith('Failure to create room');
    });

    it('should join a room successfully', async () => {
        const joinedRoom = { ...mockRoom };

        socketServiceMock.connect.and.callFake(() => {
            return true;
        });
        socketServiceMock.send.and.callFake(() => {
            return true;
        });
        socketServiceMock.on.and.callFake((event: string, action: (data?: unknown) => void) => {
            if (event === GameSessionEvents.JoinAck) action(joinedRoom);
        });

        const result = await service.joinRoom('1234');
        expect(result).toBe(joinedRoom);
        expect(service.room).toBe(joinedRoom);
    });

    it('should handle join room failure', async () => {
        const mockRoomId = '1234';

        socketServiceMock.connect.and.callFake(() => {
            return true;
        });
        socketServiceMock.send.and.callFake(() => {
            return true;
        });
        socketServiceMock.on.and.callFake((event: string, action: (data?: unknown) => void) => {
            if (event === GameSessionEvents.JoinFailed) action('Join failed');
        });

        await expectAsync(service.joinRoom(mockRoomId)).toBeRejectedWith('Join failed');
    });

    it('should return the player when getPlayer is called', () => {
        service.player = mockPlayer;
        const result = service.getPlayer();
        expect(result).toBe(mockPlayer);
    });

    it('should return true if player is host', () => {
        service.player = { ...mockPlayer, isHost: true };
        expect(service.isHost()).toBeTrue();
    });

    it('should return false if player is not host', () => {
        service.player = { ...mockPlayer, isHost: false };
        expect(service.isHost()).toBeFalse();
    });

    it('should update roomLockedSubject when notifyRoomLocked is called', () => {
        const spy = spyOn(service.roomLockedSubject, 'next');
        service.notifyRoomLocked(true);
        expect(spy).toHaveBeenCalledWith(true);
        service.notifyRoomLocked(false);
        expect(spy).toHaveBeenCalledWith(false);
    });

    it('should send player info when socket is alive', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        service.player = { ...mockPlayer, isHost: true };
        const attributes = { speedPoints: 5, lifePoints: 5, offensePoints: 5, defensePoints: 5 } as Attributes;
        const inventory: Item[] = [];

        service.sendPlayerInfos('testUser', 'warrior', attributes, 3, inventory);

        expect(service.player).toEqual(
            jasmine.objectContaining({
                userName: 'testUser',
                attributes: attributes,
                characterType: 'warrior',
                isHost: true,
                socketId: '1234',
                nbWins: 3,
                hasActed: false,
                inventory: inventory,
            }),
        );
        expect(socketServiceMock.send).toHaveBeenCalledWith(GameSessionEvents.UpdatePlayerInfo, service.player);
    });

    it('should not send player info when socket is not alive', () => {
        socketServiceMock.isSocketAlive.and.returnValue(false);
        const attributes = { speedPoints: 5, lifePoints: 5, offensePoints: 5, defensePoints: 5 } as Attributes;
        const inventory: Item[] = [];

        service.sendPlayerInfos('testUser', 'warrior', attributes, 3, inventory);

        expect(socketServiceMock.send).not.toHaveBeenCalled();
    });

    it('should send addVirtualPlayer event with correct data', () => {
        service.room = mockRoom;
        service.addVirtualPlayer(true);
        expect(socketServiceMock.send).toHaveBeenCalledWith(GameSessionEvents.AddVirtualPlayer, { roomId: '1234', isAgressive: true });

        service.addVirtualPlayer(false);
        expect(socketServiceMock.send).toHaveBeenCalledWith(GameSessionEvents.AddVirtualPlayer, { roomId: '1234', isAgressive: false });
    });

    it('should register event handlers when enableListners is called', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        const onSpy = socketServiceMock.on;

        service.room = { ...mockRoom, players: [], takenCharacters: [], isLocked: false };

        service.enableListners();

        expect(onSpy.calls.count()).toBeGreaterThan(0);
        expect(onSpy).toHaveBeenCalledWith(GameSessionEvents.PlayersUpdate, jasmine.any(Function));
        expect(onSpy).toHaveBeenCalledWith(GameSessionEvents.TakenCharactersUpdate, jasmine.any(Function));
        expect(onSpy).toHaveBeenCalledWith(GameSessionEvents.RoomLockToggled, jasmine.any(Function));
        expect(onSpy).toHaveBeenCalledWith(GameSessionEvents.RoomDestroyed, jasmine.any(Function));
        expect(onSpy).toHaveBeenCalledWith(GameLogicEvents.StartGame, jasmine.any(Function));
    });

    it('should handle events correctly when enableListners is called', () => {
        socketServiceMock.isSocketAlive.and.returnValue(true);
        service.room = { ...mockRoom, players: [], takenCharacters: [], isLocked: false };
        service.player = { socketId: '1234', userName: 'OldName' } as Player;
        const onHandlers: { [event: string]: Function } = {};

        socketServiceMock.on.and.callFake((event: string, handler: Function) => {
            onHandlers[event] = handler;
        });

        const routerNavigateSpy = routerSpy.navigate;

        service.enableListners();

        // Simulate PlayersUpdate event
        const newPlayers = [{ socketId: '1234', userName: 'NewName' }] as Player[];
        socketServiceMock.getId.and.returnValue('1234');
        onHandlers[GameSessionEvents.PlayersUpdate](newPlayers);
        expect(service.room.players).toEqual(newPlayers);
        expect(service.player.userName).toEqual('NewName');

        // Simulate TakenCharactersUpdate event
        const newCharacters = ['warrior', 'mage'];
        const takenCharactersNextSpy = spyOn(service.takenCharactersSubject, 'next');
        onHandlers[GameSessionEvents.TakenCharactersUpdate](newCharacters);
        expect(service.room.takenCharacters).toEqual(newCharacters);
        expect(takenCharactersNextSpy).toHaveBeenCalledWith(newCharacters);

        // Simulate RoomLockToggled event
        onHandlers[GameSessionEvents.RoomLockToggled](true);
        expect(service.room.isLocked).toBeTrue();

        // Simulate RoomDestroyed event
        onHandlers[GameSessionEvents.RoomDestroyed]();
        expect(routerNavigateSpy).toHaveBeenCalledWith(['/home']);

        // Simulate StartGame event
        onHandlers[GameLogicEvents.StartGame]();
        expect(routerNavigateSpy).toHaveBeenCalledWith(['/game']);

        // Simulate RoomLockToggled event with notifyRoomLocked
        const notifyRoomLockedSpy = spyOn(service, 'notifyRoomLocked');
        onHandlers[GameSessionEvents.RoomLockToggled](false);
        expect(service.room.isLocked).toBeFalse();
        expect(notifyRoomLockedSpy).toHaveBeenCalledWith(false);
    });

    it('should not enable listeners if socket is not alive', () => {
        socketServiceMock.isSocketAlive.and.returnValue(false);
        const onSpy = socketServiceMock.on;
        service.enableListners();
        expect(onSpy).not.toHaveBeenCalled();
    });
});
