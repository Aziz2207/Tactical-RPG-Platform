import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ClientItem } from '@app/classes/item';
import { ClientMap } from '@app/classes/map';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { ItemEnum } from '@common/item-enum';

@Component({
    selector: 'app-items-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './item.component.html',
    styleUrl: './item.component.scss',
})
export class ItemComponent implements OnInit {
    itemCountObj: { [key: string]: { items: ClientItem[]; count: number } } = {};
    itemArray: string[] = [];

    constructor(public mapEditerService: MapEditorService) {}

    ngOnInit(): void {
        this.mapEditerService.mapState$.subscribe((map: ClientMap | null) => {
            if (map) {
                this.countItems(map);
                this.itemArray = Object.keys(this.itemCountObj);
            }
        });
    }

    countItems(map: ClientMap): void {
        this.itemCountObj = {};
        map._items.forEach((item) => {
            const key: ItemEnum = item.itemType;
            if (this.itemCountObj[key]) {
                this.itemCountObj[key].items.push(item);
                if (!item.isOnGrid) {
                    this.itemCountObj[key].count++;
                }
            } else {
                this.itemCountObj[key] = { items: [item], count: item.isOnGrid ? 0 : 1 };
            }
        });
    }

    onDragStart(event: DragEvent, itemName: string) {
        const itemId: number | undefined = this.itemCountObj[itemName].items.find((item) => !item.isOnGrid)?.id;
        if (itemId) event.dataTransfer?.setData('itemId', itemId.toString());
    }
}
