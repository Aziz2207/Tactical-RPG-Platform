import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiceComponent } from '@app/components/dice/dice.component';
import { TemporaryDialogComponent } from '@app/components/temporary-dialog/temporary-dialog.component';
import { TimerComponent } from '@app/components/timer/timer.component';
import { COMBAT_TURN_LENGTH } from '@app/constants';
import { mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { CombatService } from '@app/services/sockets/combat/combat.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { of } from 'rxjs';
import { Socket } from 'socket.io-client';
import { CombatModalComponent } from './combat-modal.component';

describe('CombatModalComponent', () => {
    let component: CombatModalComponent;
    let mockSocket: Socket;
    let fixture: ComponentFixture<CombatModalComponent>;
    let combatServiceSpy: jasmine.SpyObj<CombatService>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let diceMock1: jasmine.SpyObj<DiceComponent>;
    let diceMock2: jasmine.SpyObj<DiceComponent>;

    beforeEach(async () => {
        mockSocket = { data: { roomCode: '1234' }, id: 'player' } as unknown as Socket;
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['on', 'send']);
        combatServiceSpy = jasmine.createSpyObj('CombatService', [
            'initSocketListeners',
            'combatTurnTime$',
            'isAttacker',
            'removeListeners',
            'isCurrentTurn',
            'isInCombat',
            'resetPlayerHp',
            'evasionLeft',
        ]);
        diceMock1 = jasmine.createSpyObj('DiceComponent', ['rollDice']);
        diceMock2 = jasmine.createSpyObj('DiceComponent', ['rollDice']);

        await TestBed.configureTestingModule({
            imports: [CombatModalComponent, DiceComponent, TimerComponent, TemporaryDialogComponent],
            providers: [
                { provide: CombatService, useValue: combatServiceSpy },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(CombatModalComponent);
        component = fixture.componentInstance;
        socketCommunicationServiceSpy.socket = mockSocket;
        combatServiceSpy.combatTurnTime$ = of(COMBAT_TURN_LENGTH);
        component.dice1 = diceMock1;
        component.dice2 = diceMock2;
        combatServiceSpy.activePlayer = mockLobbyPlayers[2];
        combatServiceSpy.opponent = mockLobbyPlayers[5];
        combatServiceSpy.attacker = mockLobbyPlayers[2];
        combatServiceSpy.defender = mockLobbyPlayers[5];
        combatServiceSpy.evasionsActivePlayer = new Array(2).fill(1);
        combatServiceSpy.evasionsOpponent = new Array(2).fill(1);
        combatServiceSpy.activePlayerResult = { total: 0, diceValue: 1 };
        combatServiceSpy.opponentResult = { total: 0, diceValue: 1 };

        fixture.detectChanges();
    });

    it('should clean up on destroy', () => {
        component.ngOnDestroy();
        expect(combatServiceSpy.removeListeners).toHaveBeenCalled();
    });

    it('should initialize properties and call required methods in ngOnInit', () => {
        component.ngOnInit();
        expect(component.activePlayer).toBe(combatServiceSpy.activePlayer);
        expect(component.opponent).toBe(combatServiceSpy.opponent);
        expect(combatServiceSpy.initSocketListeners).toHaveBeenCalled();
    });

    it('should subscribe to "attackValues" event and call rolldice', () => {
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'attackValues') {
                callback({} as T);
            }
        });
        spyOn(component.dice1, 'rollDice');
        spyOn(component.dice2, 'rollDice');

        component.ngOnInit();
        expect(component.dice1.rollDice).toHaveBeenCalled();
        expect(component.dice2.rollDice).toHaveBeenCalled();
    });

    it('should call resetPlayerHp, set isInCombat and emit closeModalEvent when closeModal is called', () => {
        combatServiceSpy.isInCombat = true;
        component.closeModal();

        expect(combatServiceSpy.resetPlayerHp).toHaveBeenCalledWith(combatServiceSpy.activePlayer, combatServiceSpy.opponent);
        expect(component.isInCombat).toBe(true);
    });

    it('should call socketCommunicationService.send with "attackPlayer" when triggerAttack is called', () => {
        combatServiceSpy.canAttackOrEvade = true;
        component.triggerAttack();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('attackPlayer');
        expect(combatServiceSpy.canAttackOrEvade).toBe(false);
    });

    it('should call socketCommunicationService.send with "evadeCombat" and attacker when triggerEvade is called', () => {
        combatServiceSpy.canAttackOrEvade = true;
        component.triggerEvade();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('evadeCombat');
        expect(combatServiceSpy.canAttackOrEvade).toBe(false);
    });

    it('should return true if player can evade', () => {
        combatServiceSpy.isCurrentTurn.and.returnValue(true);
        combatServiceSpy.evasionLeft.and.returnValue(true);
        combatServiceSpy.canAttackOrEvade = true;

        const result = component.canEvade();
        expect(result).toBe(true);
        expect(combatServiceSpy.isCurrentTurn).toHaveBeenCalled();
        expect(combatServiceSpy.evasionLeft).toHaveBeenCalled();
    });

    it('should return true if player can attack', () => {
        combatServiceSpy.isCurrentTurn.and.returnValue(true);
        combatServiceSpy.canAttackOrEvade = true;

        const result = component.canAttack();
        expect(result).toBe(true);
        expect(combatServiceSpy.isCurrentTurn).toHaveBeenCalled();
    });
});
