import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GameObjectComponent } from '@app/components/map-editor/game-object/game-object.component';
import { SimpleDialogMessageComponent } from '@app/components/simple-dialog-message/simple-dialog-message.component';
import { DialogResult } from '@app/constants';
import { DialogData } from '@app/interfaces/dialog-data';
import { ItemSwap } from '@common/interfaces/item-swap';
import { PathRoute } from '@common/interfaces/route';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-simple-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, SimpleDialogMessageComponent, FormsModule, GameObjectComponent, TranslateModule],
    templateUrl: './simple-dialog.component.html',
    styleUrl: './simple-dialog.component.scss',
})
export class SimpleDialogComponent {
    dialogTitle: string = '';
    options: string[] = ['', ''];
    inputValue: string = '';
    showError: boolean = false;
    descriptionPosition: string = 'top';

    constructor(
        private dialogRef: MatDialogRef<SimpleDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData,
        private router: Router,
    ) {
        this.options = data.options;
    }

    onClose() {
        this.dialogRef.close({
            action: this.data.confirm ? DialogResult.Left : DialogResult.Close,
            input: this.data.isInput ? this.inputValue : null,
        });
        if (this.data.title === "MAP_VALIDATOR.SAVE_SUCCESS") {
          this.router.navigate([PathRoute.Admin]);
        }
    }

    onCancel() {
        if (this.data.isInput && this.inputValue.trim() === '' && this.data.confirm) {
            this.showError = true;
            return;
        }
        this.dialogRef.close({
            action: 'right',
            input: this.data.isInput ? this.inputValue : null,
        });
        this.showError = false;
    }

    swapItems(isSwappedItemFirst: boolean, itemSwap: ItemSwap): ItemSwap | null {
        if (this.data.itemSwap) {
            const swappedItem = isSwappedItemFirst ? itemSwap.currentItem1 : itemSwap.currentItem2;
            const temp = { ...swappedItem };
            Object.assign(swappedItem, this.data.itemSwap.pickedUpItem);
            Object.assign(this.data.itemSwap.pickedUpItem, temp);
            return this.data.itemSwap;
        }
        return null;
    }

    close() {
        this.dialogRef.close();
    }
}
