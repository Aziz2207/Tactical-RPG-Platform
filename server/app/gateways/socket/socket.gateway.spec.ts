import { IMessage } from "@app/interfaces/message.interface";
import { mockAttacker } from "@app/mocks/mock-combat-infos";
import { mockGame } from "@app/mocks/mock-game";
import { mockPlayers } from "@app/mocks/mock-players";
import { mockRoom, mockRooms } from "@app/mocks/mock-room";
import { CombatService } from "@app/services/combat/combat.service";
import { GameService } from "@app/services/game/game.service";
import { MessageService } from "@app/services/message/message.service";
import { RoomService } from "@app/services/room/room.service";
import { avatars } from "@common/avatars-info";
import { Behavior, Player } from "@common/interfaces/player";
import { ActionData } from "@common/interfaces/socket-data.interface";
import { gameObjects } from "@common/objects-info";
import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SinonStubbedInstance, createStubInstance } from "sinon";
import { Server, Socket } from "socket.io";
import { SocketGateway } from "./socket.gateway";
import { UserService } from "@app/services/user/user.service";
/* eslint-disable max-lines */

describe("SocketGateway", () => {
  let gateway: SocketGateway;
  let socket: jest.Mocked<Socket>;
  let server: jest.Mocked<Server>;
  let roomService: RoomService;
  let gameService: GameService;
  let messageService: MessageService;
  let logger: SinonStubbedInstance<Logger>;
  let roomId: string;
  let mockClient: Socket;
  let mockPlayer: Player;
  let combatService: CombatService;

  beforeEach(async () => {
    const combatServiceMock = {
      startFight: jest.fn(),
      attackPlayer: jest.fn(),
      isInCombat: jest.fn(),
      handleDisconnectedPlayer: jest.fn(),
    };

    const messageServiceMock = {
      onMessageReceived: jest.fn(),
      saveMessage: jest.fn(),
    };
    const userServiceMock = {
      signUserIn: jest.fn(),
      signUserOut: jest.fn(),
    };

    const roomServiceMock = {
      setServer: jest.fn(),
      joinRoom: jest.fn(),
      createRoom: jest.fn(),
      leaveRoom: jest.fn(),
      isPlayerAdmin: jest.fn(),
      deleteRoom: jest.fn(),
      getRoom: jest.fn(),
      getRoomId: jest.fn(),
      rooms: new Map(),
    };

    const gameServiceMock = {
      connectPlayerToGame: jest.fn(),
      leavePlayerFromGame: jest.fn(),
      toggleLockRoom: jest.fn(),
      handleCreatePlayer: jest.fn(),
      createBot: jest.fn(),
      selectedAvatar: jest.fn(),
      onKickPlayer: jest.fn(),
      onKickBot: jest.fn(),
      onStartGame: jest.fn(),
      removePlayerFromRoom: jest.fn(),
      stopGameTimers: jest.fn(),
      getActivePlayer: jest.fn(),
      onTurnEnded: jest.fn(),
      onStartTurn: jest.fn(),
      processNavigation: jest.fn(),
      assignAvatarToBot: jest.fn(),
      assignStatsToBot: jest.fn(),
      updateAvatarsForAllClients: jest.fn(),
      handleDebugMode: jest.fn(),
      processTeleportation: jest.fn(),
      handleDoor: jest.fn(),
      handleJoinGame: jest.fn(),
    };

    socket = {
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      data: {},
    } as unknown as jest.Mocked<Socket>;

    const broadcastOperator = {
      emit: jest.fn(),
    };

    server = {
      to: jest.fn().mockReturnValue(broadcastOperator),
      sockets: {
        sockets: new Map(),
        adapter: {
          rooms: new Map(),
        },
      },
    } as unknown as jest.Mocked<Server>;

    logger = createStubInstance(Logger);
    roomId = "1234";
    mockClient = {
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      id: "test-client-id",
      data: { roomCode: roomId },
    } as unknown as Socket;

    mockPlayer = mockPlayers[0];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        { provide: RoomService, useValue: roomServiceMock },
        { provide: Logger, useValue: logger },
        { provide: GameService, useValue: gameServiceMock },
        { provide: CombatService, useValue: combatServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compile();

    gateway = module.get<SocketGateway>(SocketGateway);
    roomService = module.get<RoomService>(RoomService);
    gameService = module.get<GameService>(GameService);
    combatService = module.get<CombatService>(CombatService);
    messageService = module.get<MessageService>(MessageService);
    gateway["server"] = server;
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  it("should call setServer on roomService when onModuleInit is called", () => {
    gateway.onModuleInit();
    expect(roomService.setServer).toHaveBeenCalledWith(server);
  });

  it("should log when a client connects", () => {
    jest.spyOn(logger, "log");
    gateway.handleConnection(socket);
    expect(logger.log).toHaveBeenCalled();
  });

  describe("disconnect", () => {
    it("should log when a client disconnects", () => {
      (roomService.getRoom as jest.Mock).mockReturnValue(mockRooms[0]);
      jest.spyOn(combatService, "handleDisconnectedPlayer");
      jest.spyOn(logger, "log");
      gateway.handleDisconnect(socket);
      expect(combatService.handleDisconnectedPlayer).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalled();
    });
    it("should log when a client disconnects and is not in a room", () => {
      jest.spyOn(logger, "log");
      gateway.handleDisconnect(socket);
      expect(logger.log).toHaveBeenCalledWith(
        `Client disconnected but was not in a room: ${socket.id}`
      );
    });
  });

  describe("joinRoom", () => {
    it("should leave room if connectionRes has errorType roomNotFound", () => {
      roomService.rooms.set(roomId, mockRooms[0]);
      jest.spyOn(gameService, "handleJoinGame");
      gateway.handleJoinRoom(mockClient, roomId);

      expect(gameService.handleJoinGame).toHaveBeenCalled();
    });
  });

  it("should call roomService createRoom, emit roomCreated, and log the event", () => {
    const room = mockRooms[0];
    (roomService.createRoom as jest.Mock).mockReturnValue(room);
    gateway.handleCreateRoom(socket as Socket, mockGame);

    expect(roomService.createRoom).toHaveBeenCalledWith(socket, mockGame);
    expect(socket.emit).toHaveBeenCalledWith("roomCreated", room);
    expect(logger.log.calledOnce).toBeTruthy();
  });

  it("should call gameService leavePlayerFromGame on leaveRoom event", () => {
    jest.spyOn(gameService, "leavePlayerFromGame");
    gateway.handleLeaveRoom(socket, roomId);
    expect(gameService.leavePlayerFromGame).toHaveBeenCalled();
    expect(logger.debug.calledOnce).toBeTruthy();
  });

  it("should call getRoom and selectedAvatar on selectCharacter event", () => {
    jest.spyOn(roomService, "getRoom");
    jest.spyOn(gameService, "selectedAvatar");
    gateway.handleSelectCharacter(socket, avatars[0]);
    expect(roomService.getRoom).toHaveBeenCalled();
    expect(gameService.selectedAvatar).toHaveBeenCalled();
  });

  it("should call getRoomId and toggleLockRoom on changeLockRoom event", () => {
    const isLocked = false;
    jest.spyOn(roomService, "getRoomId");
    jest.spyOn(gameService, "toggleLockRoom");
    gateway.handleLockRoom(socket, isLocked);
    expect(roomService.getRoomId).toHaveBeenCalled();
    expect(gameService.toggleLockRoom).toHaveBeenCalled();
  });

  it("should call getRoom and emit on isLocked event", () => {
    (roomService.getRoom as jest.Mock).mockReturnValue(mockRooms[0]);
    gateway.handleIsRoomLocked(socket);
    expect(roomService.getRoom).toHaveBeenCalled();
    expect(socket.emit).toBeTruthy();
  });

  describe("handleCreatePlayer", () => {
    it("should create a player and emit updatedPlayer events", () => {
      const room = mockRooms[0];
      (roomService.getRoom as jest.Mock).mockReturnValue(room);
      gameService.handleCreatePlayer = jest.fn();
      room.listPlayers.push(mockPlayer);

      gateway.handleCreatePlayer(mockClient, mockPlayer);

      expect(roomService.getRoom).toHaveBeenCalledWith(mockClient);
      expect(gameService.handleCreatePlayer).toHaveBeenCalled();
    });
  });

  describe("handleKickPlayer", () => {
    it("should call onkickplayer on kickPlayer event", () => {
      gameService.onKickPlayer = jest.fn();
      gateway.handleKickPlayer(socket, mockPlayer.id);

      expect(gameService.onKickPlayer).toHaveBeenCalled();
    });
  });

  describe("handleMessage", () => {
    it("should call onMessageReceived on message event", () => {
      const mockMessageData: IMessage = {
        roomId,
        username: socket.data.username,
        message: "I am the prince of all Saiyans!",
        timestamp: new Date(),
      };

      gateway.handleMessage(socket, mockMessageData);

      expect(messageService.onMessageReceived).toHaveBeenCalled();
    });
  });

  describe("handleStartGame", () => {
    it("should call processMapObjects and onStartGame startGame event", () => {
      jest.spyOn(gameService, "onStartGame");
      gateway.handleStartGame(socket);
      expect(gameService.onStartGame).toHaveBeenCalledWith(socket);
    });
  });

  it("should call onTurnEnded endTurn event", () => {
    jest.spyOn(gameService, "onTurnEnded");
    jest.spyOn(logger, "debug");

    gateway.handleEndTurn(socket);
    expect(gameService.onTurnEnded).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `client ${socket.id} turn is over`
    );
  });

  it("should call onStartTurn startTurn event", () => {
    jest.spyOn(gameService, "onStartTurn");
    gateway.handleBeforeStartTurn(socket);
    expect(gameService.onStartTurn).toHaveBeenCalled();
  });

  it("should call processNavigation playerNavigation event", () => {
    (roomService.getRoom as jest.Mock).mockReturnValue(mockRooms[0]);
    jest.spyOn(gameService, "processNavigation");
    const path = [{ x: 1, y: 2 }];
    gateway.handlePlayerNavigation(mockClient, path);
    expect(gameService.processNavigation).toHaveBeenCalled();
  });

  it("should call processTeleportation during teleportPlayer event", () => {
    (roomService.getRoom as jest.Mock).mockReturnValue(mockRooms[0]);
    jest.spyOn(gameService, "processTeleportation");
    const position = { x: 1, y: 2 };
    gateway.handleTeleportPlayer(mockClient, position);
    expect(gameService.processTeleportation).toHaveBeenCalled();
  });

  it("should call set tiles doorAction event", () => {
    jest.spyOn(gameService, "handleDoor");
    const doorActionData: ActionData = {
      clickedPosition: { x: 0, y: 0 },
      player: mockPlayer,
    };

    gateway.handleDoorAction(mockClient, doorActionData);
    expect(gameService.handleDoor).toHaveBeenCalledWith(
      mockClient,
      doorActionData
    );
  });

  it("should create and assign a bot with an avatar and stats, then notify clients", () => {
    const behavior = Behavior.Aggressive;
    gameService.createBot = jest.fn();
    gateway.handleCreateBot(mockClient, behavior);
    expect(gameService.createBot).toHaveBeenCalledWith(behavior, mockClient);
  });

  it("should kick a bot, update avatars, and notify clients", () => {
    const botId = "bot";
    gameService.onKickBot = jest.fn();

    gateway.handleKickBot(mockClient, botId);

    expect(gameService.onKickBot).toHaveBeenCalledWith(mockClient, botId);
  });

  it("should update debugMode in gameService, update logs and emit debugMode", () => {
    const debugMode = true;
    jest.spyOn(gameService, "handleDebugMode");
    gateway.handleDebugMode(mockClient, debugMode);
    expect(gameService.handleDebugMode).toHaveBeenCalledWith(
      debugMode,
      mockClient
    );
  });

  it("should call startFight startFight event", () => {
    const combatActionData = {
      clickedPosition: { x: 1, y: 2 },
      player: mockAttacker,
    } as ActionData;
    combatService.startFight = jest.fn();
    gateway.handleCombatAction(mockClient, combatActionData);
    expect(combatService.startFight).toHaveBeenCalled();
  });

  it("should call attackPlayer attackPlayer event", () => {
    combatService.attackPlayer = jest.fn();
    gateway.handleAttackPlayer(mockClient);
    expect(combatService.attackPlayer).toHaveBeenCalled();
  });

  it("should call evadingPlayer evadingPlayer event", () => {
    combatService.evadingPlayer = jest.fn();
    gateway.handleEvadeCombat(mockClient);
    expect(combatService.evadingPlayer).toHaveBeenCalled();
  });

  it("should emit pathfound on findPath event", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    const position = { x: 0, y: 0 };

    (roomService.getRoom as jest.Mock).mockReturnValue(mockRoom);
    gameService.getActivePlayer = jest.fn().mockReturnValue(mockPlayer);
    mockRoom.navigation.findFastestPath = jest.fn().mockReturnValue(path);

    gateway.handleFindPath(socket, position);
    expect(gameService.getActivePlayer).toHaveBeenCalledWith(mockRoom);
    expect(roomService.getRoom).toHaveBeenCalledWith(socket);
    expect(mockRoom.navigation.findFastestPath).toHaveBeenCalledWith(
      mockPlayer,
      position,
      mockRoom
    );
    expect(server.to(roomId).emit).toHaveBeenCalledWith("pathFound", path);
  });

  describe("getRoom", () => {
    it("should call roomService.getRoom and emit the room data to the client", () => {
      (roomService.getRoom as jest.Mock).mockReturnValue(mockRooms[0]);
      gateway.handleGetRoom(socket);
      expect(roomService.getRoom).toHaveBeenCalled();
      expect(socket.emit).toBeTruthy();
    });
  });

  it("should call start item swap on ItemSwapped event", () => {
    const inventoryToUndo = [gameObjects[0], gameObjects[1]];
    const newInventory = [gameObjects[2], gameObjects[1]];
    const droppedItem = gameObjects[0];
    gameService.startItemSwap = jest.fn();
    gateway.handleItemSwapped(mockClient, {
      inventoryToUndo,
      newInventory,
      droppedItem,
    });
    expect(gameService.startItemSwap).toHaveBeenCalled();
  });
});
