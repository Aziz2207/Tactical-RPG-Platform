import { Overlay } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { EditErrorDialogComponent } from '@app/components/edit-error-dialog/edit-error-dialog.component';
import { GridComponent } from '@app/components/grid/grid.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { ItemComponent } from '@app/components/item/item.component';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { CONSTANTS } from '@common/constants';
import { TileEnum } from '@common/tile-enum';
import html2canvas from 'html2canvas';
import { distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'app-edit-page',
    standalone: true,
    imports: [CommonModule, GridComponent, HeaderComponent, ItemComponent, FormsModule, RouterLink, ButtonComponent],
    templateUrl: './edit-page.component.html',
    styleUrl: './edit-page.component.scss',
})
export class EditPageComponent implements OnInit, OnDestroy {
    @ViewChild(GridComponent) gridComponent!: GridComponent;
    @ViewChild('grid', { read: ElementRef }) grid: ElementRef;
    gamePrev: string = '';
    gameName: string = '';
    gameDescription: string = '';
    tileEnum = TileEnum;
    maxName = CONSTANTS.MAX_NAME_LENGTH;
    maxDescription = CONSTANTS.MAX_DESCRIPTION_LENGTH;
    private isDialogOpen = false;

    constructor(
        public mapEditerService: MapEditorService,
        private saveGameService: SaveGameService,
        private router: Router,
        private dialog: MatDialog,
        private overlay: Overlay,
    ) {}

    ngOnDestroy() {
        this.mapEditerService.reinitialise();
        this.saveGameService.resetId();
    }

    ngOnInit() {
        if (!this.mapEditerService.getSelectedGame()) {
            this.router.navigate(['/admin']);
        }
        this.mapEditerService.errorMessage$.pipe(distinctUntilChanged()).subscribe((message) => {
            this.openErrorDialog(message);
        });

        this.saveGameService.errorMessage$.pipe(distinctUntilChanged()).subscribe((message) => {
            this.openErrorDialog(message);
        });
        window.addEventListener('drop', this.onDropOutside.bind(this));
        window.addEventListener('dragover', (event) => event.preventDefault());
    }

    switchTile(tileName: TileEnum) {
        const tile: TileEnum = tileName;
        this.mapEditerService.setSelectedTile(tile);
    }

    endDrag(): void {
        this.mapEditerService.isLeftDragging = false;
        this.mapEditerService.isRightDragging = false;
    }

    resetGame() {
        this.mapEditerService.resetMap();
    }

    async captureGrid(): Promise<void> {
        const gridElement = this.grid.nativeElement as HTMLElement;
        if (gridElement) {
            const prevImg = await html2canvas(gridElement);
            this.gamePrev = prevImg.toDataURL('image/jpeg', CONSTANTS.IMAGE_PREV_VALUE);
        }
    }

    async saveGame() {
        await this.captureGrid();
        this.saveGameService.addGamePrev(this.gamePrev);
        this.mapEditerService.submit();
    }

    onDropOutside(event: DragEvent) {
        const x = Number(event.dataTransfer?.getData('x'));
        const y = Number(event.dataTransfer?.getData('y'));
        this.mapEditerService.removeItem(x, y);
    }

    openErrorDialog(message: string): void {
        if (this.isDialogOpen) return;

        this.isDialogOpen = true;

        const cleanMessage = message.split(' - ID: ')[0];

        const dialogRef = this.dialog.open(EditErrorDialogComponent, {
            data: { message: cleanMessage },
            width: '600px',
            height: '200px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['edit-error-dialog-container'],
        });

        dialogRef.afterClosed().subscribe(() => {
            this.isDialogOpen = false;
        });
    }
}
