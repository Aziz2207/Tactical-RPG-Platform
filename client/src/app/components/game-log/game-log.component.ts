import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameLogService } from '@app/services/game-log/game-log-service.service';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { LogMessage } from '@common/interfaces/log-message';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-log',
    templateUrl: './game-log.component.html',
    styleUrls: ['./game-log.component.scss'],
    standalone: true,
})
export class GameLogComponent implements OnInit, OnDestroy {
    logMessages: LogMessage[] = [];
    filteredMessages: LogMessage[] = [];
    showOnlyInvolved: boolean = false;
    playerId: string;
    private gameLoggerSubscription: Subscription = new Subscription();

    constructor(
        private gameLogService: GameLogService,
        private room: RoomManagerService,
    ) {}

    ngOnInit(): void {
        this.playerId = this.gameLogService.getPlayerId();
        const roomId = this.getRoomId();
        if (roomId) this.gameLogService.setRoomId(roomId);

        this.gameLoggerSubscription.add(
            this.gameLogService.getLogMessages().subscribe((messages) => {
                this.logMessages = messages;
                this.applyFilter();
            }),
        );
    }

    ngOnDestroy(): void {
        this.gameLoggerSubscription.unsubscribe();
    }

    toggleFilter() {
        this.showOnlyInvolved = !this.showOnlyInvolved;
        this.applyFilter();
    }

    getRoomId() {
        return this.room?.room?.code;
    }

    private applyFilter() {
        if (this.showOnlyInvolved) {
            this.filteredMessages = this.logMessages.filter((msg) => msg.playersInvolved.includes(this.playerId));
        } else {
            this.filteredMessages = [...this.logMessages];
        }
    }
}
