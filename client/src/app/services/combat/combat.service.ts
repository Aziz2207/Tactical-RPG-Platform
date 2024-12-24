import { Injectable } from '@angular/core';
import { CombatParams } from '@app/interfaces/combat-params';
import { GameService } from '@app/services/game/game.service';
import { SocketService } from '@app/services/socket/socket.service';
import { CONSTANTS } from '@common/constants';
import { CombatEvents } from '@common/event-enums/combat.gateway.events';
import { Combat, CombatMove } from '@common/interfaces/combat';
import { Player } from '@common/interfaces/player';

@Injectable({
    providedIn: 'root',
})
export class CombatService {
    combat: Combat | undefined;
    currentlyAttacking: boolean = false;
    currentlyDefending: boolean = false;
    player1: Player | undefined;
    player2: Player | undefined;
    defenseRollObject: DiceRollingObject | undefined;
    attackRollObject: DiceRollingObject | undefined;
    player1Params: CombatParams | undefined;
    player2Params: CombatParams | undefined;
    combatTimer: number;
    escaped: boolean;

    constructor(
        private socketService: SocketService,
        private gameService: GameService,
    ) {}

    startCombat(targetPlayerUser: string): void {
        if (this.gameService.isMyTurn()) {
            this.socketService.send<string>(CombatEvents.StartCombat, targetPlayerUser);
        }
    }

    combatMove(combatMove: CombatMove): void {
        if (this.combat && this.combat.attacker.player.socketId === this.socketService.getId()) {
            this.socketService.send<CombatMove>(CombatEvents.CombatMove, combatMove);
        }
    }

    handleAttack(combat: Combat): void {
        if (combat.attackResult) {
            this.attackRollObject = {
                currentRoll: 1,
                finalRoll: combat.attackResult.attackRoll - combat.attacker.player.attributes.offensePoints,
                isDone: false,
            };
            this.defenseRollObject = {
                currentRoll: 1,
                finalRoll: combat.attackResult.defenseRoll - combat.defender.player.attributes.defensePoints,
                isDone: false,
            };
            const attackerN = 10;
            const defenderN = 14;
            const attackerX = combat.attacker.player.attributes.diceChoice === 'attack' ? CONSTANTS.DICE_6 : CONSTANTS.DICE_4;
            const defenderX = combat.defender.player.attributes.diceChoice === 'defense' ? CONSTANTS.DICE_6 : CONSTANTS.DICE_4;
            this.diceRoller(attackerX, attackerN, this.attackRollObject);
            this.diceRoller(defenderX, defenderN, this.defenseRollObject);
        }
    }

    isInCombat(socketId: string): boolean {
        if (!this.combat) return false;
        return this.combat.attacker.player.socketId === socketId || this.combat.defender.player.socketId === socketId;
    }

    enableListeners(): void {
        if (!this.socketService.isSocketAlive()) return;

        this.registerCombatStartListener();
        this.registerCombatResultListener();
        this.registerTurnListeners();
        this.registerCombatEventsListeners();
        this.registerRunFailedListener();
        this.registerCombatClockListener();
        this.registerCombatAbortListener();
        this.registerNextCombatTurnListener();
        this.registerContinueTurnListener();
    }

    updateCanRun(player: Player, playerParams: { onIce: boolean; canRun: boolean } | undefined, combat: Combat) {
        if (!player || !playerParams) return;

        const hasChip = combat.attacker.player.inventory.some((item) => item.itemType === 'chip');

        if (combat.attacker.runAttempts >= CONSTANTS.MAX_RUNS && !hasChip) {
            playerParams.canRun = false;
        } else if (combat.attacker.runAttempts >= CONSTANTS.MAX_RUNS_CHIP && hasChip) {
            playerParams.canRun = false;
        }
    }

    diceRoller(nFaces: number, nIterations: number, rollObj: DiceRollingObject) {
        let delay = 30;
        const maxDelay = 200;
        let iteration = 0;
        rollObj.isDone = false;
        const growthFactor = 1.1;

        function oneRoll() {
            if (iteration === nIterations) {
                rollObj.currentRoll = rollObj.finalRoll;
                rollObj.isDone = true;
            } else {
                rollObj.currentRoll = Math.floor(Math.random() * nFaces) + 1;
                delay = Math.min(maxDelay, delay * growthFactor);
                iteration++;
                setTimeout(oneRoll, delay);
            }
        }
        oneRoll();
    }

    reset() {
        this.combat = undefined;
        this.currentlyAttacking = false;
        this.currentlyDefending = false;
        this.player1 = undefined;
        this.player2 = undefined;
        this.attackRollObject = undefined;
        this.defenseRollObject = undefined;
        this.player1Params = undefined;
        this.player2Params = undefined;
    }

    private registerCombatStartListener(): void {
        this.socketService.on<Combat>(CombatEvents.StartCombat, (combat?: Combat) => {
            if (combat) {
                this.combat = combat;
                this.player1 = combat.attacker.player;
                this.player1Params = { onIce: combat.attacker.onIce, canRun: true };
                this.player2 = combat.defender.player;
                this.player2Params = { onIce: combat.defender.onIce, canRun: true };
            }
        });
    }

    private registerCombatResultListener(): void {
        this.socketService.on<Combat>(CombatEvents.CombatResult, (combat?: Combat) => {
            if (combat) {
                this.handleAttack(combat);
            } else {
                this.escaped = true;
            }
            setTimeout(() => this.reset(), CONSTANTS.COMBAT_LISTENER_DELAY);
        });
    }

    private registerTurnListeners(): void {
        this.socketService.on<void>(CombatEvents.YourAttack, () => {
            this.currentlyAttacking = true;
            this.currentlyDefending = false;
        });

        this.socketService.on<void>(CombatEvents.YourDefense, () => {
            this.currentlyAttacking = false;
            this.currentlyDefending = true;
        });

        this.socketService.on<void>(CombatEvents.CombatTurnExpired, () => {
            this.currentlyAttacking = false;
        });
    }

    private registerCombatEventsListeners(): void {
        this.socketService.on<Combat>(CombatEvents.AttackResult, (combat: Combat) => {
            this.combat = combat;
            this.currentlyAttacking = false;
            this.currentlyDefending = false;
            this.handleAttack(combat);
        });
    }

    private registerRunFailedListener(): void {
        this.socketService.on<Combat>(CombatEvents.RunFailed, (combat: Combat) => {
            const currentPlayer = this.player1?.socketId === combat.attacker.player.socketId ? this.player1 : this.player2;
            const currentParams = currentPlayer === this.player1 ? this.player1Params : this.player2Params;
            if (currentPlayer && currentParams) {
                this.updateCanRun(currentPlayer, currentParams, combat);
            }
            this.currentlyAttacking = false;
            this.currentlyDefending = false;
        });
    }

    private registerCombatClockListener(): void {
        this.socketService.on<number>(CombatEvents.CombatClock, (count: number) => {
            this.combatTimer = count;
        });
    }

    private registerCombatAbortListener(): void {
        this.socketService.on<void>(CombatEvents.CombatAborted, () => {
            this.reset();
        });
        this.socketService.on<void>(CombatEvents.CombatEnded, () => {
            this.reset();
        });
    }

    private registerNextCombatTurnListener(): void {
        this.socketService.on<Combat>(CombatEvents.NextCombatTurn, (combat: Combat) => {
            if (this.player1 && this.player2) {
                this.combat = combat;
                this.player1 = combat.attacker.player.socketId === this.player1?.socketId ? combat.attacker.player : combat.defender.player;
                this.player2 = combat.attacker.player.socketId === this.player2?.socketId ? combat.attacker.player : combat.defender.player;
                this.attackRollObject = undefined;
                this.defenseRollObject = undefined;
            }
        });
    }

    private registerContinueTurnListener(): void {
        this.socketService.on<void>(CombatEvents.ContinueTurn, () => {
            this.reset();
        });
    }
}

export type DiceRollingObject = {
    currentRoll: number;
    finalRoll: number;
    isDone: boolean;
};
