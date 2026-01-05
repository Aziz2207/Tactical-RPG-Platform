import { DEFAULT_AVATARS } from '@common/avatars-info';
import { Player, Status } from '@common/interfaces/player';
import { GameStatus, Room } from '@common/interfaces/room';
import { defaultGlobalStats } from './default-global-stats';
import { mockGame, mockGameDebug } from './mock-game';
import { mockNavigation } from './mock-navigation';
import { mockPlayers } from './mock-players';

export const mockRoom: Room = {
    gameMap: mockGame,
    roomId: '1234',
    listPlayers: mockPlayers,
    availableAvatars: DEFAULT_AVATARS,
    adminId: 'admin1234',
    isLocked: false,
    gameStatus: GameStatus.Lobby,
    navigation: mockNavigation,
    globalPostGameStats: defaultGlobalStats,
};

export const mockRooms: Room[] = [
    {
        gameMap: mockGame,
        roomId: '1234',
        listPlayers: [],
        availableAvatars: DEFAULT_AVATARS,
        adminId: 'admin1234',
        isLocked: false,
        gameStatus: GameStatus.Lobby,
        navigation: mockNavigation,
        globalPostGameStats: defaultGlobalStats,
    },
    {
        gameMap: mockGame,
        roomId: '2345',
        listPlayers: [],
        availableAvatars: DEFAULT_AVATARS,
        adminId: 'admin2345',
        isLocked: false,
        gameStatus: GameStatus.Lobby,
        navigation: mockNavigation,
        globalPostGameStats: defaultGlobalStats,
    },
    {
        gameMap: mockGame,
        roomId: '1234',
        listPlayers: [
            {
                id: 'bot',
                name: 'Bot-Player',
                status: Status.Bot, // Assuming Status.Bot represents a bot player
                avatar: DEFAULT_AVATARS[0], // Assigning an avatar to the bot player
            } as Player, // Cast to the Player type
        ],
        availableAvatars: DEFAULT_AVATARS,
        adminId: 'admin1234',
        isLocked: false,
        gameStatus: GameStatus.Lobby,
        globalPostGameStats: defaultGlobalStats,
    },
];

export const mockRoomDebug: Room[] = [
    {
        gameMap: mockGameDebug,
        roomId: '1234',
        listPlayers: [],
        availableAvatars: DEFAULT_AVATARS,
        adminId: 'admin1234',
        isLocked: false,
        gameStatus: GameStatus.Lobby,
        navigation: mockNavigation,
        globalPostGameStats: defaultGlobalStats,
        isDebug: true,
    },
    {
        gameMap: mockGame,
        roomId: '1234',
        listPlayers: [],
        availableAvatars: DEFAULT_AVATARS,
        adminId: 'admin1234',
        isLocked: false,
        gameStatus: GameStatus.Lobby,
        globalPostGameStats: defaultGlobalStats,
        isDebug: false,
    },
];
