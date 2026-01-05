import { WaitingRoom }from '@common/interfaces/waiting-room'
import { GameAvailability } from "@common/interfaces/room";

export const mockWaitingRooms: WaitingRoom[] = [
    {
        roomId: "1234",
        gameName: "hola",
        gameImage: "./assets/images/maps/example_map.jpg",
        gameDescription: "game description",
        gameMode: "CTF",
        gameDimension: 10,
        playerCount: 2,
        maxPlayers: 4,
        gameAvailability: GameAvailability.FriendsOnly as string,
        adminId: "6969",
        entryFee: 0,
        dropInEnabled: false,
    },
    {
        roomId: "5678",
        gameName: "bye",
        gameImage: "./assets/images/maps/example_map.jpg",
        gameDescription: "other game description",
        gameMode: "Classic",
        gameDimension: 15,
        playerCount: 4,
        maxPlayers: 4,
        gameAvailability: GameAvailability.Public as string,
        adminId: "132123",
        entryFee: 15,
        dropInEnabled: true,
    },
];
