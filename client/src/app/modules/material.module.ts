import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';

const modules = [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatRadioModule,
    MatToolbarModule,
    MatTooltipModule,
    MatTableModule,
    MatSortModule,
];

/**
 * Material module
 * IMPORTANT : IMPORT ONLY USED MODULES !!!!!!
 */
@NgModule({
    imports: [...modules],
    exports: [...modules],
    providers: [],
})
export class AppMaterialModule {}
