import { fakeAsync, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TemporaryDialogComponent } from '@app/components/temporary-dialog/temporary-dialog.component';
import { DialogMessages, DialogTitle, INFO_DIALOG_TIME } from '@app/constants';
import { mockAttacker, mockCombatPlayers, mockCombatResultDetails, mockDefender } from '@app/mocks/mock-combat-infos';
import { mockPlayers } from '@app/mocks/mock-players';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { ServerToClientEvent } from '@common/socket.events';
import { of } from 'rxjs';
import { Socket } from 'socket.io-client';
import { CombatService } from './combat.service';

describe('CombatService', () => {
    let service: CombatService;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<TemporaryDialogComponent>>;
    let mockSocket: Socket;

    beforeEach(() => {
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['send', 'on', 'off']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        dialogRefSpy = jasmine.createSpyObj('SimpleDialogComponent', ['afterClosed', 'close']);
        dialogRefSpy.afterClosed.and.returnValue(of(undefined));
        dialogSpy.open.and.returnValue(dialogRefSpy);
        mockSocket = { data: { roomCode: '1234' }, id: 'player' } as unknown as Socket;
        socketCommunicationServiceSpy.socket = mockSocket;

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: MatDialog, useValue: dialogSpy },
            ],
        });
        service = TestBed.inject(CombatService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize combat', () => {
        spyOn(service, 'setTurnMessage');
        service.initializeCombat(mockCombatPlayers, true);
        expect(service.activePlayer).toEqual(mockAttacker);
        expect(service.opponent).toEqual(mockDefender);
        expect(service.attacker).toEqual(mockAttacker);
        expect(service.defender).toEqual(mockDefender);
        expect(service.isInCombat).toBe(true);
        expect(service.combatStatus).toBe('');
        expect(service.setTurnMessage).toHaveBeenCalled();
    });

    it('should initialize combat', () => {
        spyOn(service, 'setTurnMessage');
        service.initializeCombat(mockCombatPlayers, false);
        expect(service.activePlayer).toEqual(mockDefender);
        expect(service.opponent).toEqual(mockAttacker);
        expect(service.attacker).toEqual(mockAttacker);
        expect(service.defender).toEqual(mockDefender);
        expect(service.isInCombat).toBe(true);
        expect(service.combatStatus).toBe('');
        expect(service.setTurnMessage).toHaveBeenCalled();
    });

    it('should subscribe to "combatTime" event and update combatTurnTimeSource', () => {
        const timeRemaining = 30;
        const nextSpy = spyOn(service['combatTurnTimeSource'], 'next');
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'combatTime') {
                callback(timeRemaining as T);
            }
        });

        service.initSocketListeners();
        expect(nextSpy).toHaveBeenCalledWith(timeRemaining);
    });

    it('should update the stats', () => {
        service.activePlayer = { ...mockCombatPlayers.attacker };
        service.opponent = { ...mockCombatPlayers.defender };
        spyOn(service, 'isAttacker').and.returnValue(true);
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.UpdateStats) {
                callback(mockCombatPlayers as T);
            }
        });
        service.initSocketListeners();
        expect(service.activePlayer.attributes.attack).toEqual(mockCombatPlayers.attacker.attributes.attack);
        expect(service.opponent.attributes.defense).toEqual(mockCombatPlayers.defender.attributes.defense);
    });

    it('should update the stats the other way around if activePlayer is the defender', () => {
        service.activePlayer = { ...mockCombatPlayers.defender };
        service.opponent = { ...mockCombatPlayers.attacker };
        spyOn(service, 'isAttacker').and.returnValue(false);
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.UpdateStats) {
                callback(mockCombatPlayers as T);
            }
        });
        service.initSocketListeners();
        expect(service.activePlayer.attributes.defense).toEqual(mockCombatPlayers.defender.attributes.defense);
        expect(service.opponent.attributes.attack).toEqual(mockCombatPlayers.attacker.attributes.attack);
    });

    it('should decrease the correct hp', () => {
        const currentHp = mockPlayers[0].attributes.currentHp;
        spyOn(service, 'isAttacker').and.returnValue(true);
        service.activePlayer = { ...mockPlayers[0] };
        service.onAttackFailWithArmor();
        expect(service.activePlayer.attributes.currentHp).toEqual(currentHp - 1);
    });

    it('should subscribe to "attackValues" event and call onAttackValues', () => {
        spyOn(service, 'onAttackValues');
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'attackValues') {
                callback(mockCombatResultDetails as T);
            }
        });

        service.initSocketListeners();
        expect(service.onAttackValues).toHaveBeenCalledWith(mockCombatResultDetails);
    });

    it('should subscribe to "attackSuccess" event and call onAttackSuccess', () => {
        spyOn(service, 'onAttackSuccess');
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'attackSuccess') {
                callback(mockAttacker as T);
            }
        });

        service.initSocketListeners();
        expect(service.onAttackSuccess).toHaveBeenCalledWith(mockAttacker);
    });

    it('should subscribe to "attackFail" event and update combatStatus', () => {
        const data = { attacker: mockAttacker, shouldDamageSelf: true };
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'attackFail') {
                callback(data as T);
            }
        });
        service.opponent = mockPlayers[1];
        service.activePlayer = data.attacker;
        service.initSocketListeners();
        expect(service.combatStatus).toBe(`${data.attacker.name} a échoué son attaque.`);
    });

    it('should call onEvasion with the event evasionSuccess', () => {
        const data = { listPlayers: mockPlayers, player: mockAttacker };
        spyOn(service, 'onEvasion');
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'evasionSuccess') {
                callback(data as T);
            }
        });
        service.initSocketListeners();
        expect(service.onEvasion).toHaveBeenCalledWith(mockAttacker);
    });

    it('should subscribe to "evasionFail" event and update combatStatus and evasion count', () => {
        service.activePlayer = mockAttacker;
        service.evasionsActivePlayer = [1];
        spyOn(service, 'isAttacker').and.returnValue(true);

        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'evasionFail') {
                callback(mockAttacker as T);
            }
        });

        service.initSocketListeners();

        expect(service.combatStatus).toBe(`${mockAttacker.name} n'a pas réussi à s'évader.`);
        expect(service.evasionsActivePlayer.length).toBe(0);
    });

    it('should subscribe to "evasionFail" event ', () => {
        service.activePlayer = mockAttacker;
        service.evasionsOpponent = [1];
        spyOn(service, 'isAttacker').and.returnValue(false);

        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'evasionFail') {
                callback(mockAttacker as T);
            }
        });

        service.initSocketListeners();
        expect(service.combatStatus).toBe(`${mockAttacker.name} n'a pas réussi à s'évader.`);
        expect(service.evasionsOpponent.length).toBe(0);
    });

    it('should subscribe to "combatTurnEnded" event and call onCombatTurnEnded', () => {
        const failEvasion = true;
        spyOn(service, 'onCombatTurnEnded');
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'combatTurnEnded') {
                callback({ combatPlayers: mockCombatPlayers, failEvasion: true } as T);
            }
        });

        service.initSocketListeners();
        expect(service.onCombatTurnEnded).toHaveBeenCalledWith(mockCombatPlayers, failEvasion);
    });

    it('should subscribe to "defaultWin" event and call onPlayerDisconnected', () => {
        spyOn(service, 'onPlayerDisconnected');
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.DefaultCombatWin) {
                callback({} as T);
            }
        });

        service.initSocketListeners();
        expect(service.onPlayerDisconnected).toHaveBeenCalled();
        expect(service.isInCombat).toBeFalse();
    });

    it('should remove all socket event listeners', () => {
        service.removeListeners();

        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.CombatTime);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.AttackValues);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.AttackSuccess);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.AttackFail);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.EvasionFail);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.CombatTurnEnded);
        expect(socketCommunicationServiceSpy.off).toHaveBeenCalledWith(ServerToClientEvent.DefaultCombatWin);
    });

    it('should return true when active player has remaining evasions', () => {
        service.evasionsActivePlayer = [1, 1];
        service.activePlayer = mockAttacker;
        spyOn(service, 'isAttacker').and.returnValue(true);

        expect(service.evasionLeft()).toBeTrue();
    });

    it('should return false when active player has no remaining evasions', () => {
        service.evasionsActivePlayer = [];
        service.activePlayer = mockAttacker;
        spyOn(service, 'isAttacker').and.returnValue(true);

        expect(service.evasionLeft()).toBeFalse();
    });

    it('should return true when opponent has remaining evasions', () => {
        service.evasionsOpponent = [1];
        service.activePlayer = mockDefender;
        spyOn(service, 'isAttacker').and.returnValue(false);

        expect(service.evasionLeft()).toBeTrue();
    });

    it('should open the TemporaryDialogComponent with correct configuration', () => {
        const dialogConfig = {
            disableClose: true,
            data: {
                title: DialogTitle.DefaultFightWin,
                message: DialogMessages.DefaultFightWin,
                duration: INFO_DIALOG_TIME,
            },
        };

        service.onPlayerDisconnected();
        expect(dialogSpy.open).toHaveBeenCalledWith(TemporaryDialogComponent, dialogConfig);
    });

    it('should call openTempDialog and set isInCombat to false onCombatEnd', () => {
        service.isInCombat = true;
        service.onCombatEnd(mockAttacker);

        expect(dialogSpy.open).toHaveBeenCalledWith(TemporaryDialogComponent, {
            data: {
                title: DialogTitle.EndFight,
                message: DialogMessages.EndFight + mockAttacker.name,
                duration: INFO_DIALOG_TIME,
            },
            disableClose: true,
        });
        expect(service.isInCombat).toBeFalse();
    });

    it('should call openTempDialog and set isInCombat to false onEvasion', () => {
        service.isInCombat = true;
        service.onEvasion(mockAttacker);

        expect(dialogSpy.open).toHaveBeenCalledWith(TemporaryDialogComponent, {
            data: {
                title: DialogTitle.SuccessEvasion,
                message: mockAttacker.name + " a réussi à s'évader !",
                duration: INFO_DIALOG_TIME,
            },
            disableClose: true,
        });
        expect(service.isInCombat).toBeFalse();
    });

    it('should update stats and combat players when failEvasion is false', () => {
        spyOn(service, 'determineStats');
        spyOn(service, 'setTurnMessage');
        service.activePlayer = mockAttacker;
        service.opponent = mockDefender;

        service.onCombatTurnEnded(mockCombatPlayers, false);
        expect(service.determineStats).toHaveBeenCalledWith(mockAttacker);
        expect(service.determineStats).toHaveBeenCalledWith(mockDefender);
        expect(service.attacker).toBe(mockAttacker);
        expect(service.defender).toBe(mockDefender);
        expect(service.setTurnMessage).toHaveBeenCalled();
        expect(service.determineStats).toHaveBeenCalled();
    });

    it('should decrement opponent HP if activePlayer is the attacker', () => {
        const expectedHp = mockDefender.attributes.currentHp - 1;
        service.activePlayer = mockAttacker;
        service.opponent = mockDefender;
        spyOn(service, 'isAttacker').and.returnValue(true);
        service.onAttackSuccess(mockAttacker);
        expect(service.opponent.attributes.currentHp).toEqual(expectedHp);
    });

    it('should decrement activePlayer HP if opponent is the attacker', () => {
        const expectedHp = mockAttacker.attributes.currentHp - 1;
        service.activePlayer = mockAttacker;
        service.opponent = mockDefender;
        spyOn(service, 'isAttacker').and.returnValue(false);
        service.onAttackSuccess(mockAttacker);
        expect(service.activePlayer.attributes.currentHp).toEqual(expectedHp);
    });

    it('should update dice result and manage isRolling with a delay', fakeAsync(() => {
        service.onAttackValues(mockCombatResultDetails);
        expect(service['attackResult']).toEqual(mockCombatResultDetails.attackValues);
        expect(service['defenseResult']).toEqual(mockCombatResultDetails.defenseValues);
    }));

    it('should reset players HP to their total HP', () => {
        const player1 = mockAttacker;
        const player2 = mockDefender;
        player1.attributes.currentHp = 17;
        player2.attributes.currentHp = 5;
        service.resetPlayerHp(player1, player2);

        expect(player1.attributes.currentHp).toBe(mockAttacker.attributes.totalHp);
        expect(player2.attributes.currentHp).toBe(mockDefender.attributes.totalHp);
    });

    describe('determineStats', () => {
        it('should return attackResult if player is the attacker', () => {
            service['attackResult'] = mockCombatResultDetails.attackValues;
            spyOn(service, 'isAttacker').and.returnValue(true);

            const result = service.determineStats(mockAttacker);
            expect(result).toEqual(mockCombatResultDetails.attackValues);
        });

        it('should return defenseResult if player is not the attacker', () => {
            service['defenseResult'] = mockCombatResultDetails.defenseValues;
            spyOn(service, 'isAttacker').and.returnValue(false);

            const result = service.determineStats(mockDefender);
            expect(result).toEqual(mockCombatResultDetails.defenseValues);
        });
    });

    describe('isAttacker', () => {
        it('should return true if the player is the attacker', () => {
            service.attacker = mockAttacker;
            const result = service.isAttacker(mockAttacker);
            expect(result).toBeTrue();
        });

        it('should return false if the player is not the attacker', () => {
            service.attacker = mockAttacker;
            const result = service.isAttacker(mockDefender);
            expect(result).toBeFalse();
        });
    });

    describe('isCurrentTurn', () => {
        it('should return true if the socket ID matches the attacker ID', () => {
            socketCommunicationServiceSpy.socket.id = mockAttacker.id;
            service.attacker = mockAttacker;
            const result = service.isCurrentTurn();
            expect(result).toBeTrue();
        });

        it('should return false if the socket ID does not match the attacker ID', () => {
            service.attacker = mockDefender;
            const result = service.isCurrentTurn();
            expect(result).toBeFalse();
        });
    });

    describe('isCurrentPlayer', () => {
        it('should return true if the socket ID matches the player ID', () => {
            socketCommunicationServiceSpy.socket.id = mockAttacker.id;
            const result = service.isCurrentPlayer(mockAttacker);
            expect(result).toBeTrue();
        });

        it('should return false if the socket ID does not match the player ID', () => {
            const result = service.isCurrentPlayer(mockDefender);
            expect(result).toBeFalse();
        });
    });

    describe('setTurnMessage', () => {
        it('should set turnMessage to "Cest votre tour" if it is the current turn', () => {
            spyOn(service, 'isCurrentTurn').and.returnValue(true);
            service.setTurnMessage();
            expect(service.turnMessage).toBe("C'est votre tour");
        });

        it('should set turnMessage to "Cest le tour de votre adversaire" if it is not the current turn', () => {
            spyOn(service, 'isCurrentTurn').and.returnValue(false);
            service.setTurnMessage();
            expect(service.turnMessage).toBe("C'est le tour de votre adversaire");
        });
    });
});
