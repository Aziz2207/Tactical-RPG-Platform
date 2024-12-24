import { NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { DiceComponent } from '@app/components/dice/dice.component';
import { CombatService } from '@app/services/combat/combat.service';
import { GameLogService } from '@app/services/game-log/game-log-service.service';
import { GameService } from '@app/services/game/game.service';
import { CombatMove } from '@common/interfaces/combat';
import { Player } from '@common/interfaces/player';

@Component({
    selector: 'app-combat',
    standalone: true,
    imports: [DiceComponent, NgStyle],
    templateUrl: './combat.component.html',
    styleUrl: './combat.component.scss',
})
export class CombatComponent {
    combatMessage: string;
    isSecretClicked: boolean = false;

    constructor(
        public combatService: CombatService,
        public gameLogService: GameLogService,
        public gameService: GameService,
    ) {
        this.gameLogService.combatMessage$.subscribe((message) => {
            this.combatMessage = message;
        });
    }

    combatMove(move: CombatMove) {
        if (move === 'attack') {
            this.combatService.combatMove(move);
        } else if (move === 'run') {
            this.combatService.combatMove(move);
        }
    }

    isPlayerInCombat(): boolean {
        return (
            this.gameService.gameState.player.socketId === this.combatService.player1?.socketId ||
            this.gameService.gameState.player.socketId === this.combatService.player2?.socketId
        );
    }

    isOnIce(player: Player | undefined): boolean {
        if (!player) return false;
        if (player.socketId === this.combatService.player1?.socketId) {
            return this.combatService.player1Params?.onIce ?? false;
        }
        if (player.socketId === this.combatService.player2?.socketId) {
            return this.combatService.player2Params?.onIce ?? false;
        }
        return false;
    }

    canRun(): boolean {
        if (this.gameService.gameState.player.socketId === this.combatService.player1?.socketId) {
            return this.combatService.player1Params?.canRun ?? true;
        }
        if (this.gameService.gameState.player.socketId === this.combatService.player2?.socketId) {
            return this.combatService.player2Params?.canRun ?? true;
        }
        return true;
    }

    onSecretButtonClick() {
        this.isSecretClicked = !this.isSecretClicked;
    }

    getRunAttempts(player: Player | undefined): number {
        if (!player) return 0;
        if (player.socketId === this.combatService.player1?.socketId && this.combatService.combat) {
            return this.combatService.combat?.attacker.player.socketId === this.combatService.player1.socketId
                ? this.combatService.combat.attacker.runAttempts
                : this.combatService.combat.defender.runAttempts;
        }
        if (player.socketId === this.combatService.player2?.socketId && this.combatService.combat) {
            return this.combatService.combat?.attacker.player.socketId === this.combatService.player2.socketId
                ? this.combatService.combat.attacker.runAttempts
                : this.combatService.combat.defender.runAttempts;
        }
        return 0;
    }
}
