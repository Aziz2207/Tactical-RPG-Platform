import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { Player } from '@common/interfaces/player';

@Component({
    selector: 'app-player-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './player-list.component.html',
    styleUrl: './player-list.component.scss',
})
export class PlayerListComponent {
    @Input() players: Player[] = [];
    @Input() isCurrentUserHost: boolean;

    constructor(private roomManagerService: RoomManagerService) {}

    removePlayer(playerId: string) {
        this.roomManagerService.removePlayer(playerId);
    }
}
