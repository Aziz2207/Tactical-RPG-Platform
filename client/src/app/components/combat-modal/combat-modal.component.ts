import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CombatStatsBarComponent } from '@app/components/combat-stats-bar/combat-stats-bar.component';
import { DiceComponent } from '@app/components/dice/dice.component';
import { TimerComponent } from '@app/components/timer/timer.component';
import { COMBAT_TURN_LENGTH } from '@app/constants';
import { CombatService } from '@app/services/sockets/combat/combat.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Player } from '@common/interfaces/player';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
@Component({
    selector: 'app-combat-modal',
    standalone: true,
    imports: [TimerComponent, DiceComponent, CommonModule, CombatStatsBarComponent, TranslateModule],
    templateUrl: './combat-modal.component.html',
    styleUrl: './combat-modal.component.scss',
})
export class CombatModalComponent implements OnInit, OnDestroy {
    @Input() isInCombat = false;
    @ViewChild('dice1') dice1!: DiceComponent;
    @ViewChild('dice2') dice2!: DiceComponent;
    activePlayer: Player;
    opponent: Player;

    totalTime: number = COMBAT_TURN_LENGTH;
    timeRemaining: number = COMBAT_TURN_LENGTH;
    combatTurnTime: number;
    combatStatus: string = '';
    private subscription: Subscription = new Subscription();

    constructor(
        // Used in html
        public combatService: CombatService,
        private socketCommunicationService: SocketCommunicationService,
    ) {}

    isPlayerInCombat(): boolean {
        const currentPlayerId = this.socketCommunicationService.socket.id;
        return this.activePlayer?.id === currentPlayerId || this.opponent?.id === currentPlayerId;
    }

    ngOnInit() {
        this.activePlayer = this.combatService.activePlayer;
        this.opponent = this.combatService.opponent;

        this.subscription.add(
            this.combatService.combatTurnTime$.subscribe((timeRemaining) => {
                this.combatTurnTime = timeRemaining;
            }),
        );
        this.combatService.initSocketListeners();

        this.socketCommunicationService.on(ServerToClientEvent.AttackValues, () => {
            this.dice1?.rollDice();
            this.dice2?.rollDice();
        });
    }

    ngOnDestroy() {
        this.combatService.removeListeners();
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    closeModal() {
        this.combatService.resetPlayerHp(this.combatService.activePlayer, this.combatService.opponent);
        this.isInCombat = this.combatService.isInCombat;
    }

    triggerAttack() {
        if (this.combatService.canAttackOrEvade) {
            this.socketCommunicationService.send(ClientToServerEvent.AttackPlayer);
        }
        this.combatService.canAttackOrEvade = false;
    }

    triggerEvade() {
        if (this.combatService.canAttackOrEvade) {
            const evaderId = this.socketCommunicationService.socket.id;
            this.socketCommunicationService.send(ClientToServerEvent.EvadeCombat, evaderId);
        }
        this.combatService.canAttackOrEvade = false;
    }

    canEvade() {
        return this.combatService.isCurrentTurn() && this.combatService.evasionLeft() && this.combatService.canAttackOrEvade;
    }

    canAttack() {
        return this.combatService.isCurrentTurn() && this.combatService.canAttackOrEvade;
    }
}
