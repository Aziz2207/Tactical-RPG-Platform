import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ClientTile } from '@app/classes/tile';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './grid.component.html',
    styleUrl: './grid.component.scss',
})
export class GridComponent implements OnInit, OnDestroy {
    @Input() draggedItem!: string;
    @Output() clickEmitter = new EventEmitter<ClientTile>();
    @Output() rightClickEmitter = new EventEmitter<ClientTile>();

    lastX: number | null = null;
    lastY: number | null = null;
    grid: ClientTile[][];

    constructor(public mapEditerService: MapEditorService) {}

    ngOnInit(): void {
        this.mapEditerService.mapState$.subscribe((map) => {
            if (map?._tiles) {
                this.grid = map._tiles;
                this.updateGridStyles(map._size);
            }
        });
    }

    ngOnDestroy(): void {
        this.grid = [];
    }

    updateGridStyles(size: number): void {
        const gridContainer = document.querySelector('.grid-container') as HTMLElement;
        if (gridContainer) {
            gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
            gridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;
        }
    }

    mouseHit(event: MouseEvent, x: number, y: number): void {
        event.preventDefault();
        this.lastX = x;
        this.lastY = y;
        if (event.button === 0) {
            this.mapEditerService.isLeftDragging = true;
            this.mapEditerService.setTileToSelected(x, y);
        } else if (event.button === 2) {
            this.mapEditerService.isRightDragging = true;
            this.mapEditerService.resetTile(x, y);
        }
    }

    mouseDrag(event: MouseEvent, x: number, y: number): void {
        event.preventDefault();

        if ((this.mapEditerService.isLeftDragging || this.mapEditerService.isRightDragging) && (this.lastX !== x || this.lastY !== y)) {
            this.lastX = x;
            this.lastY = y;

            if (this.mapEditerService.isLeftDragging) {
                this.mapEditerService.setTileToSelected(x, y);
            } else if (this.mapEditerService.isRightDragging) {
                this.mapEditerService.resetTile(x, y);
            }
        }
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    onDrop(event: DragEvent, x: number, y: number) {
        event.preventDefault();
        // Number gives NaN if its not a number which is falsy
        const itemId = event.dataTransfer?.getData('itemId');
        if (itemId) {
            this.mapEditerService.addItem(x, y, Number(itemId));
        }
    }

    itemClickHandler(event: MouseEvent, x: number, y: number) {
        // Right-click button
        if (event.button === 0) {
            this.mapEditerService.setTileToSelected(x, y);
        } else if (event.button === 2) {
            event.preventDefault();
            this.mapEditerService.removeItem(x, y);
        }
    }

    dragItemStart(event: DragEvent, itemId: number, x: number, y: number) {
        event.dataTransfer?.setData('itemId', itemId.toString());
        event.dataTransfer?.setData('x', x.toString());
        event.dataTransfer?.setData('y', y.toString());
    }
}
