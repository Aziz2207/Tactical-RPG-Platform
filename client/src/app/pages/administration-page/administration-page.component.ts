import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { RouterLink } from "@angular/router";
import { CreationDialogComponent } from "@app/components/creation-dialog/creation-dialog.component";
import { GameListComponent } from "@app/components/game-list/game-list.component";
import { HeaderComponent } from "@app/components/header/header.component";
import { HEIGHT_DIALOG, WIDTH_DIALOG } from "@app/constants";
import { TranslateModule } from "@ngx-translate/core";

@Component({
  selector: "app-administration-page",
  standalone: true,
  templateUrl: "./administration-page.component.html",
  styleUrls: [
    "./administration-page.component.scss",
    "../../../common/css/game-list-page.scss",
  ],
  imports: [
    CommonModule,
    RouterLink,
    GameListComponent,
    HeaderComponent,
    TranslateModule,
  ],
})
export class AdministrationPageComponent {
  @ViewChild("fileInput") fileInput!: ElementRef;
  @ViewChild(GameListComponent) gameListComponent!: GameListComponent;

  constructor(private dialog: MatDialog) {}

  openPopUp(): void {
    this.dialog.open(CreationDialogComponent, {
      width: WIDTH_DIALOG,
      height: HEIGHT_DIALOG,
    });
  }
}
