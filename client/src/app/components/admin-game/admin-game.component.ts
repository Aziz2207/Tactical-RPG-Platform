import { Overlay } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { DeleteGameDialogComponent } from '@app/components/delete-game-dialog/delete-game-dialog.component';
import { AdminService } from '@app/services/admin/admin.service';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { Game } from '@common/interfaces/game';
import { ModeEnum } from '@common/mode-enum';

@Component({
    selector: 'app-admin-game',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './admin-game.component.html',
    styleUrl: './admin-game.component.scss',
})
export class AdminGameComponent implements OnInit {
    currentGame: Game | undefined;
    modeEnum = ModeEnum;

    constructor(
        private adminService: AdminService,
        private saveGameService: SaveGameService,
        private mapEditerService: MapEditorService,
        public dialog: MatDialog,
        private overlay: Overlay,
    ) {}

    ngOnInit(): void {
        this.adminService.stateSelection$.subscribe((state) => {
            this.currentGame = state;
        });
    }

    toggleVisibilityHandler() {
        if (this.currentGame?._id) {
            this.adminService.toggleVisibility(this.currentGame._id);
        }
    }

    openDialog() {
        const dialogRef = this.dialog.open(DeleteGameDialogComponent, {
            width: '500px',
            height: '200px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['delete-dialog-container'],
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result && this.currentGame?._id) {
                this.adminService.deleteGame(this.currentGame._id);
            }
        });
    }

    async saveInfoGame() {
        if (this.currentGame?._id) {
            this.mapEditerService.setCurrentGame(this.currentGame?._id);
            this.saveGameService.storeId(this.currentGame._id);
        }
    }

    exportGame(): void {
        if (this.currentGame?._id) {
            this.adminService.exportGame(this.currentGame._id);
        }
    }
}
