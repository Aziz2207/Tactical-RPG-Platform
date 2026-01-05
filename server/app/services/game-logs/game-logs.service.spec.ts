import { LogType } from '@app/constants';
import { mockAttacker, mockCombatPlayers, mockCombatResultDetails, mockDefender } from '@app/mocks/mock-combat-infos';
import { mockPlayers, playerDisconnected } from '@app/mocks/mock-players';
import { mockRoom } from '@app/mocks/mock-room';
import { mockServer } from '@app/mocks/mock-server';
import { ObjectType } from '@common/avatars-info';
import { TileType } from '@common/constants';
import { Player } from '@common/interfaces/player';
import { Test, TestingModule } from '@nestjs/testing';
import { GameLogsService } from './game-logs.service';

describe('GameLogsService', () => {
    let service: GameLogsService;
    let mockPlayer: Player;
    let roomId: string;
    beforeEach(async () => {
        mockPlayer = mockPlayers[0];
        roomId = 'room1234';

        const module: TestingModule = await Test.createTestingModule({
            providers: [GameLogsService],
        }).compile();

        service = module.get<GameLogsService>(GameLogsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should call send log and generateDebugMessage', () => {
        const isDebugMode = true;
        service['generateDebugMessage'] = jest.fn().mockReturnValue('test');
        service['sendLog'] = jest.fn();
        service.sendDebugLog(isDebugMode, roomId, mockServer);

        expect(service['generateDebugMessage']).toHaveBeenCalledWith(isDebugMode);
        expect(service['sendLog']).toHaveBeenCalledWith(roomId, mockServer, [], 'test');
    });

    it('should call sendLog and generateItemPickupMessage', () => {
        service['generateItemPickupMessage'] = jest.fn().mockReturnValue('item picked up');
        service['sendLog'] = jest.fn();
        service.sendItemLog(mockPlayers[0], mockRoom.roomId, mockServer, ObjectType.Trident);

        expect(service['generateItemPickupMessage']).toHaveBeenCalled();
        expect(service['sendLog']).toHaveBeenCalled();
    });

    it('should generate the correct itemPickup message', () => {
        const result = service['generateItemPickupMessage'](mockPlayers[0], ObjectType.Trident);
        expect(result).toEqual(`${mockPlayers[0].name} a ramassé Trident de Poséidon`);
    });

    it('should call send log and generatePlayerLogMessage for open door', () => {
        service['generatePlayerLogMessage'] = jest.fn().mockReturnValue('test');
        service['sendLog'] = jest.fn();
        service.sendDoorLog(TileType.OpenDoor, mockPlayer, roomId, mockServer);

        expect(service['generatePlayerLogMessage']).toHaveBeenCalledWith(LogType.OpenDoor, mockPlayer.name);
        expect(service['sendLog']).toHaveBeenCalledWith(roomId, mockServer, [mockPlayer], 'test');
    });

    it('should call send log and generatePlayerLogMessage for close door', () => {
        service['generatePlayerLogMessage'] = jest.fn().mockReturnValue('test');
        service['sendLog'] = jest.fn();
        service.sendDoorLog(TileType.ClosedDoor, mockPlayer, roomId, mockServer);

        expect(service['generatePlayerLogMessage']).toHaveBeenCalledWith(LogType.CloseDoor, mockPlayer.name);
        expect(service['sendLog']).toHaveBeenCalledWith(roomId, mockServer, [mockPlayer], 'test');
    });

    it('should call send log and generateEndGameMessage', () => {
        service['generateEndGameMessage'] = jest.fn().mockReturnValue('test');
        service['sendLog'] = jest.fn();
        service.sendEndGameLog(mockPlayers, roomId, mockServer);

        expect(service['generateEndGameMessage']).toHaveBeenCalledWith(mockPlayers);
        expect(service['sendLog']).toHaveBeenCalledWith(roomId, mockServer, mockPlayers, 'test');
    });

    it('should call send log and generatePlayerLogMessage on sendGlobalCombatLog', () => {
        service['generatePlayerLogMessage'] = jest.fn().mockReturnValue('test');
        service['sendLog'] = jest.fn();
        service.sendGlobalCombatLog(roomId, mockServer, mockCombatPlayers, LogType.StartCombat);

        expect(service['generatePlayerLogMessage']).toHaveBeenCalledWith(LogType.StartCombat, mockAttacker.name, mockDefender.name);
        expect(service['sendLog']).toHaveBeenCalledWith(roomId, mockServer, [mockAttacker, mockDefender], 'test');
    });

    it('should call send log and generatePlayerLogMessage on sendPlayerLog ', () => {
        service['generatePlayerLogMessage'] = jest.fn().mockReturnValue('test');
        service['sendLog'] = jest.fn();
        service.sendPlayerLog(roomId, mockServer, mockPlayer, LogType.GiveUp);

        expect(service['generatePlayerLogMessage']).toHaveBeenCalledWith(LogType.GiveUp, mockPlayer.name);
        expect(service['sendLog']).toHaveBeenCalledWith(roomId, mockServer, [mockPlayer], 'test');
    });

    it('should call sendLog and generatePlayerLogMessage on sendGlobalCombatLog', () => {
        service['generatePlayerLogMessage'] = jest.fn().mockReturnValue('test');
        service['sendLog'] = jest.fn();
        service.sendGlobalCombatLog(roomId, mockServer, mockCombatPlayers, LogType.NoWinnerCombat);

        expect(service['generatePlayerLogMessage']).toHaveBeenCalledWith(LogType.NoWinnerCombat, mockAttacker.name, mockDefender.name);
        expect(service['sendLog']).toHaveBeenCalledWith(roomId, mockServer, [mockAttacker, mockDefender], 'test');
    });

    it('should call sendLogToCombatPlayers and generatePlayerLogMessage on evade success', () => {
        service['generatePlayerLogMessage'] = jest.fn().mockReturnValue('test');
        service['sendLogToCombatPlayers'] = jest.fn();
        service.sendCombatActionLog(roomId, mockServer, mockCombatPlayers, LogType.EvadeCombatSuccess);

        expect(service['generatePlayerLogMessage']).toHaveBeenCalledWith(LogType.EvadeCombatSuccess, mockAttacker.name);
        expect(service['sendLogToCombatPlayers']).toHaveBeenCalledWith(roomId, mockServer, mockCombatPlayers, 'test');
    });

    it('should call sendLogToCombatPlayers and generateCombatResultMessage with dice result', () => {
        service['generateCombatResultMessage'] = jest.fn().mockReturnValue('test');
        service['sendLogToCombatPlayers'] = jest.fn();
        service.sendCombatResultLog(roomId, mockServer, mockCombatPlayers);

        expect(service['generateCombatResultMessage']).toHaveBeenCalledWith(mockCombatPlayers);
        expect(service['sendLogToCombatPlayers']).toHaveBeenCalledWith(roomId, mockServer, mockCombatPlayers, 'test');
    });

    it('should create a log', () => {
        const players: Player[] = [mockPlayer];
        const message = 'Test message';
        const log = service['createLog'](players, message, roomId);

        expect(log).toEqual({
            message,
            timestamp: expect.any(Date),
            players,
        });
        expect(service.logs.get(roomId)).toContain(log);
    });

    it('should generate debug message if it is the beginning of debug mode ', () => {
        const isDebugMode = true;
        const message = service['generateDebugMessage'](isDebugMode);
        expect(message).toBe('Début du mode débogage.');
    });

    it('should generate debug message if it is the end of debug mode ', () => {
        const isDebugMode = false;
        const message = service['generateDebugMessage'](isDebugMode);
        expect(message).toBe('Fin du mode débogage.');
    });

    it('should return a message with the names of active players', () => {
        const players = mockPlayers;
        const result = service['generateEndGameMessage'](players);
        const expectedNames = mockPlayers.map((player) => player.name).join(', ');
        const expectedMessage = `Fin de partie : ${expectedNames}`;
        expect(result).toBe(expectedMessage);
    });

    it('should not return a message with the names of disconnected players', () => {
        const result = service['generateEndGameMessage']([playerDisconnected]);
        expect(result).toBe('Fin de partie : ');
    });

    it('should generate combatResult message ', () => {
        const { attackValues, defenseValues } = mockCombatResultDetails;
        const message = service['generateCombatResultMessage'](mockCombatPlayers);
        expect(message).toBe(
            `Résultat de l'attaque : ${mockAttacker.attributes.attack} + ${attackValues.diceValue} (dé) = ${attackValues.total}\n` +
                `Résultat de la défense :  ${mockDefender.attributes.defense} + ${defenseValues.diceValue} (dé) = ${defenseValues.total}`,
        );
    });

    describe('generatePlayerLogMessage', () => {
        let name;
        beforeEach(() => {
            name = mockPlayer.name;
        });
        it('should return the correct message for LogType.StartTurn', () => {
            const result = service['generatePlayerLogMessage'](LogType.StartTurn, name);
            expect(result).toBe(`Début du tour du joueur ${name}.`);
        });

        it('should return the correct message for LogType.GiveUp', () => {
            const result = service['generatePlayerLogMessage'](LogType.GiveUp, name);
            expect(result).toBe(`${name} a abandonné la partie.`);
        });

        it('should return the correct message for LogType.OpenDoor', () => {
            const result = service['generatePlayerLogMessage'](LogType.OpenDoor, name);
            expect(result).toBe(`${name} a ouvert une porte.`);
        });

        it('should return the correct message for LogType.CloseDoor', () => {
            const result = service['generatePlayerLogMessage'](LogType.CloseDoor, name);
            expect(result).toBe(`${name} a fermé une porte.`);
        });

        it('should return the correct message for LogType.WinCombat', () => {
            const result = service['generatePlayerLogMessage'](LogType.WinCombat, name);
            expect(result).toBe(`${name} a gagné le combat. Le combat est terminé !`);
        });

        it('should return the correct message for LogType.EvadeCombatSuccess', () => {
            const result = service['generatePlayerLogMessage'](LogType.EvadeCombatSuccess, name);
            expect(result).toBe(`${name} s'est évadé avec succès.`);
        });

        it('should return the correct message for LogType.EvadeCombatFail', () => {
            const result = service['generatePlayerLogMessage'](LogType.EvadeCombatFail, name);
            expect(result).toBe(`${name} a échoué son évasion.`);
        });

        it('should return the correct message for LogType.NoWinnerCombat', () => {
            const defenderName = 'player2';
            const result = service['generatePlayerLogMessage'](LogType.NoWinnerCombat, name, defenderName);
            expect(result).toBe(`Combat termniné sans gagnant entre ${name} et ${defenderName}.`);
        });

        it('should return the correct message for LogType.StartCombat', () => {
            const defenderName = 'player2';
            const result = service['generatePlayerLogMessage'](LogType.StartCombat, name, defenderName);
            expect(result).toBe(`${name} et ${defenderName} sont entrés en combat.`);
        });

        it('should return the correct message for LogType.AttackFail', () => {
            const result = service['generatePlayerLogMessage'](LogType.AttackFail, name);
            expect(result).toBe(`${name} a échoué son attaque.`);
        });

        it('should return the correct message for LogType.AttackSuccess', () => {
            const result = service['generatePlayerLogMessage'](LogType.AttackSuccess, name);
            expect(result).toBe(`${name} a réussi son attaque.`);
        });

        it('should return the default message for unknown log type', () => {
            const result = service['generatePlayerLogMessage'](-1 as unknown as LogType, name);
            expect(result).toBe('Message de log inconnu.');
        });
    });

    it('should send log if message is different', () => {
        const spyEmit = jest.spyOn(mockServer.to(roomId), 'emit');
        const message = 'test';
        const mockLog = {
            roomId,
            message,
            players: [mockPlayer],
        };
        service['createLog'] = jest.fn().mockReturnValue(mockLog);

        service['sendLog'](roomId, mockServer, [mockPlayer], message);

        expect(spyEmit).toHaveBeenCalledWith('logReceived', mockLog);
        expect(service['createLog']).toHaveBeenCalledWith([mockPlayer], message, roomId);
    });

    it('should send log to combat players if message is different', () => {
        const spyEmitAttacker = jest.spyOn(mockServer.to(mockAttacker.id), 'emit');
        const spyEmitDefender = jest.spyOn(mockServer.to(mockDefender.id), 'emit');
        const message = 'test';
        const mockLog = {
            roomId,
            message,
            players: [mockPlayer],
        };
        service['createLog'] = jest.fn().mockReturnValue(mockLog);

        service['sendLogToCombatPlayers'](roomId, mockServer, mockCombatPlayers, message);

        expect(spyEmitAttacker).toHaveBeenCalledWith('logReceived', mockLog);
        expect(spyEmitDefender).toHaveBeenCalledWith('logReceived', mockLog);
        expect(service['createLog']).toHaveBeenCalledWith([mockAttacker, mockDefender], message, roomId);
    });
});
