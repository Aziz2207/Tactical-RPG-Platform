import { Overlay } from '@angular/cdk/overlay';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddGameButtonComponent } from '@app/components/add-game-btn/add-game-btn.component';
import { AdminGameSelectionListComponent } from '@app/components/admin-game-selection-list/admin-game-selection-list.component';
import { AdminGameComponent } from '@app/components/admin-game/admin-game.component';
import { GameDescriptionComponent } from '@app/components/game-description/game-description.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { ImportButtonComponent } from '@app/components/import-button/import-button.component';
import { ImportDialogComponent } from '@app/components/import-dialog/import-dialog.component';
import { ImportErrorDialogComponent } from '@app/components/import-error-dialog/import-error-dialog.component';
import { AdminService } from '@app/services/admin/admin.service';
import { Game } from '@common/interfaces/game';

@Component({
    selector: 'app-admin-page',
    standalone: true,
    imports: [
        HeaderComponent,
        AddGameButtonComponent,
        AdminGameSelectionListComponent,
        AdminGameComponent,
        GameDescriptionComponent,
        ImportButtonComponent,
    ],
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent implements OnInit, OnDestroy {
    constructor(
        private adminService: AdminService,
        private dialog: MatDialog,
        private overlay: Overlay,
    ) {}

    ngOnDestroy(): void {
        this.adminService.reset();
    }

    ngOnInit(): void {
        this.adminService.importMessage$.subscribe((message) => {
            this.openImportErrorDialog(message);
        });
        this.adminService.reset();
    }

    onImportGame(game: Game): void {
        this.adminService.importGame(game, (conflictingGame) => {
            this.openImportDialog(conflictingGame);
        });
    }

    openImportDialog(game: Game): void {
        const dialogRef = this.dialog.open(ImportDialogComponent, {
            data: { currentTitle: game.title },
            width: '450px',
            height: '300px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['import-dialog-container'],
        });

        dialogRef.afterClosed().subscribe((newTitle) => {
            if (newTitle) {
                game.title = newTitle;
                this.onImportGame(game);
            }
        });
    }

    openImportErrorDialog(message: string): void {
        this.dialog.open(ImportErrorDialogComponent, {
            data: message,
            width: '600px',
            height: '400px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['import-error-dialog-container'],
        });
    }
}
