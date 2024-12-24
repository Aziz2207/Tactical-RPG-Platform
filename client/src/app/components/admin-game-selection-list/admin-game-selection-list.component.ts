import { Component, OnInit } from '@angular/core';
import { GameItemComponent } from '@app/components/game-item/game-item.component';
import { AdminService } from '@app/services/admin/admin.service';
import { Game } from '@common/interfaces/game';

@Component({
    selector: 'app-admin-game-selection-list',
    standalone: true,
    imports: [GameItemComponent],
    templateUrl: './admin-game-selection-list.component.html',
    styleUrl: './admin-game-selection-list.component.scss',
})
export class AdminGameSelectionListComponent implements OnInit {
    gameList: { title: string; _id: string; isVisible: boolean }[] | undefined;
    selectedGame: Game | undefined;

    constructor(private adminService: AdminService) {}

    ngOnInit(): void {
        this.adminService.stateList$.subscribe((state) => {
            this.gameList = state;
            if (this.gameList && this.gameList.length > 0 && !this.selectedGame) {
                this.selectGame(this.gameList[0]._id);
            }
        });
        this.adminService.stateSelection$.subscribe((state) => {
            this.selectedGame = state;
        });
    }

    selectGame(id: string) {
        this.adminService.selectGame(id);
    }
}
