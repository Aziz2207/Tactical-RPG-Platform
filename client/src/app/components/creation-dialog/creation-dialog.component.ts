import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MESSAGE_DURATION_SAVE_CHOICE } from '@app/constants';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameMode, MapSize } from '@common/constants';
import { PathRoute } from '@common/interfaces/route';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-creation-dialog',
    standalone: true,
    imports: [TranslateModule],
    templateUrl: './creation-dialog.component.html',
    styleUrls: ['./creation-dialog.component.scss'],
})
export class CreationDialogComponent {
    mapSize = MapSize;
    gameMode = GameMode;
    selectedSize: string;
    selectedMode: string;

    constructor(
        private dialogRef: MatDialogRef<CreationDialogComponent>,
        private router: Router,
        private gameCreationService: GameCreationService,
        private snackBar: MatSnackBar,
        private translate: TranslateService
    ) {}

    selectSize(size: MapSize) {
        this.selectedSize = size;
        this.gameCreationService.setSelectedSize(size);
        this.gameCreationService.isNewGame = true;
    }

    selectMode(mode: GameMode) {
        this.selectedMode = mode;
        this.gameCreationService.setSelectedMode(mode);
    }

    isSubmitDisabled(): boolean {
        return !this.selectedMode || !this.selectedSize;
    }

    close() {
        this.dialogRef.close();
    }

    changePage() {
        if (this.isSubmitDisabled()) {
            this.snackBar.open(this.translate.instant('MAP_SIZE_AND_MODE_PROMPT'), this.translate.instant('DIALOG.CLOSE'), {
                duration: MESSAGE_DURATION_SAVE_CHOICE,
            });
        } else {
            this.gameCreationService.isModifiable = true;
            this.router.navigate([PathRoute.EditGame]);
            this.dialogRef.close();
        }
    }
}
