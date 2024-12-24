import { NgIf } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiceComponent } from '@app/components/dice/dice.component';
import { CombatService } from '@app/services/combat/combat.service';
import { GameLogService } from '@app/services/game-log/game-log-service.service';
import { GameService } from '@app/services/game/game.service';
import { Combat, CombatMove } from '@common/interfaces/combat';
import { Player } from '@common/interfaces/player';
import { Subject } from 'rxjs';
import { CombatComponent } from './combat.component';

describe('CombatComponent', () => {
    let component: CombatComponent;
    let fixture: ComponentFixture<CombatComponent>;
    let mockCombatService: jasmine.SpyObj<CombatService>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGameLogService: jasmine.SpyObj<GameLogService>;
    let combatMessageSubject: Subject<string>;

    beforeEach(async () => {
        mockCombatService = jasmine.createSpyObj('CombatService', ['combatMove', 'isInCombat']);
        mockGameService = jasmine.createSpyObj('GameService', [], {
            gameState: {
                player: { socketId: 'currentPlayerId' },
            },
        });
        combatMessageSubject = new Subject<string>();
        mockGameLogService = jasmine.createSpyObj('GameLogService', [], {
            combatMessage$: combatMessageSubject.asObservable(),
        });

        await TestBed.configureTestingModule({
            imports: [DiceComponent, NgIf, CombatComponent], // Import CombatComponent here
            providers: [
                { provide: CombatService, useValue: mockCombatService },
                { provide: GameService, useValue: mockGameService },
                { provide: GameLogService, useValue: mockGameLogService },
            ],
            // Remove declarations array since we're dealing with standalone components
        }).compileComponents();

        fixture = TestBed.createComponent(CombatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should trigger run animation and call combatMove with run', () => {
        const move: CombatMove = 'run';
        mockCombatService.combat = {
            attacker: { player: { socketId: 'player1' } },
            defender: { player: { socketId: 'player2' } },
        } as Combat;
        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player2 = { socketId: 'player2' } as Player;

        component.combatMove(move);

        expect(mockCombatService.combatMove).toHaveBeenCalledWith(move);
    });

    it('should return true if the player is in combat', () => {
        // Mocking gameService and combatService
        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player2 = { socketId: 'player2' } as Player;
        const mockGameState = { player: { socketId: 'player1' } }; // Current player is player1
        component.gameService = { gameState: mockGameState } as any;

        expect(component.isPlayerInCombat()).toBeTrue();
    });

    it('should return false if the player is not in combat', () => {
        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player2 = { socketId: 'player2' } as Player;
        const mockGameState = { player: { socketId: 'player3' } }; // Current player is not in combat
        component.gameService = { gameState: mockGameState } as any;

        expect(component.isPlayerInCombat()).toBeFalse();
    });
    it('should return true if the player1 is on ice', () => {
        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player1Params = { canRun: true, onIce: true };

        expect(component.isOnIce(mockCombatService.player1)).toBeTrue();
    });

    it('should return false if the player1 is not on ice', () => {
        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player1Params = { canRun: true, onIce: false };

        expect(component.isOnIce(mockCombatService.player1)).toBeFalse();
    });

    it('should return false if player is undefined', () => {
        expect(component.isOnIce(undefined)).toBeFalse();
    });

    it('should return true if player2 is on ice', () => {
        mockCombatService.player2 = { socketId: 'player2' } as Player;
        mockCombatService.player2Params = { canRun: true, onIce: true };

        expect(component.isOnIce(mockCombatService.player2)).toBeTrue();
    });

    it('should return false if player2 is not on ice', () => {
        mockCombatService.player2 = { socketId: 'player2' } as Player;
        mockCombatService.player2Params = { canRun: true, onIce: false };

        expect(component.isOnIce(mockCombatService.player2)).toBeFalse();
    });

    it('should return true if the current player can run', () => {
        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player1Params = { onIce: true, canRun: true };
        const mockGameState = { player: { socketId: 'player1' } };
        component.gameService = { gameState: mockGameState } as any;

        expect(component.canRun()).toBeTrue();
    });

    it('should return false if the current player cannot run', () => {
        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player1Params = { onIce: true, canRun: false };
        const mockGameState = { player: { socketId: 'player1' } };
        component.gameService = { gameState: mockGameState } as any;

        expect(component.canRun()).toBeFalse();
    });

    it('should return true if player2 can run', () => {
        mockCombatService.player2 = { socketId: 'player2' } as Player;
        mockCombatService.player2Params = { onIce: true, canRun: true };
        const mockGameState = { player: { socketId: 'player2' } };
        component.gameService = { gameState: mockGameState } as any;

        expect(component.canRun()).toBeTrue();
    });

    it('should return false if player2 cannot run', () => {
        mockCombatService.player2 = { socketId: 'player2' } as Player;
        mockCombatService.player2Params = { onIce: true, canRun: false };
        const mockGameState = { player: { socketId: 'player2' } };
        component.gameService = { gameState: mockGameState } as any;

        expect(component.canRun()).toBeFalse();
    });
    it('should toggle isSecretClicked when onSecretButtonClick is called', () => {
        expect(component.isSecretClicked).toBeFalse();

        component.onSecretButtonClick();

        expect(component.isSecretClicked).toBeTrue();

        component.onSecretButtonClick();

        expect(component.isSecretClicked).toBeFalse();
    });

    it('should return 0 if the player is undefined', () => {
        expect(component.getRunAttempts(undefined)).toBe(0);
    });

    it('should return attacker runAttempts if player1 is the attacker', () => {
        mockCombatService.combat = {
            attacker: { player: { socketId: 'player1' }, runAttempts: 3 },
            defender: { player: { socketId: 'player2' }, runAttempts: 2 },
        } as Combat;

        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player2 = { socketId: 'player2' } as Player;

        expect(component.getRunAttempts(mockCombatService.player1)).toBe(3); // Player1 is the attacker
    });

    it('should return defender runAttempts if player1 is the defender', () => {
        mockCombatService.combat = {
            attacker: { player: { socketId: 'player2' }, runAttempts: 3 },
            defender: { player: { socketId: 'player1' }, runAttempts: 2 },
        } as Combat;

        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player2 = { socketId: 'player2' } as Player;

        expect(component.getRunAttempts(mockCombatService.player1)).toBe(2); // Player1 is the defender
    });

    it('should return attacker runAttempts if player2 is the attacker', () => {
        mockCombatService.combat = {
            attacker: { player: { socketId: 'player2' }, runAttempts: 3 },
            defender: { player: { socketId: 'player1' }, runAttempts: 2 },
        } as Combat;

        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player2 = { socketId: 'player2' } as Player;

        expect(component.getRunAttempts(mockCombatService.player2)).toBe(3); // Player2 is the attacker
    });

    it('should return defender runAttempts if player2 is the defender', () => {
        mockCombatService.combat = {
            attacker: { player: { socketId: 'player1' }, runAttempts: 3 },
            defender: { player: { socketId: 'player2' }, runAttempts: 2 },
        } as Combat;

        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player2 = { socketId: 'player2' } as Player;

        expect(component.getRunAttempts(mockCombatService.player2)).toBe(2); // Player2 is the defender
    });

    it('should return 0 if the player is not involved in the combat', () => {
        mockCombatService.combat = {
            attacker: { player: { socketId: 'player1' }, runAttempts: 3 },
            defender: { player: { socketId: 'player2' }, runAttempts: 2 },
        } as Combat;

        mockCombatService.player1 = { socketId: 'player1' } as Player;
        mockCombatService.player2 = { socketId: 'player2' } as Player;

        const playerNotInCombat = { socketId: 'player3' } as Player;
        expect(component.getRunAttempts(playerNotInCombat)).toBe(0);
    });
});
