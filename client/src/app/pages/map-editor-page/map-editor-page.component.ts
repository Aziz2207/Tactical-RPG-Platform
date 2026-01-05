import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { GameGridComponent } from "@app/components/map-editor/game-grid/game-grid.component";
import { GameObjectsContainerComponent } from "@app/components/map-editor/game-objects-container/game-objects-container.component";
import { ToolbarComponent } from "@app/components/map-editor/toolbar/toolbar.component";
import { SimpleDialogComponent } from "@app/components/simple-dialog/simple-dialog.component";
import {
  //CHECK_BEFORE_SAVING_DELAY,
  MAX_LEN_MAP_DESCRIPTION,
  MAX_LEN_MAP_TITLE,
} from "@app/constants";
import { Info } from "@app/interfaces/info";
import { MapEditorService } from "@app/services/map-editor/map-editor.service";
import { SaveGameService } from "@app/services/save-game/save-game.service";
import html2canvas from "html2canvas";

import { HeaderComponent } from "@app/components/header/header.component";
import { GameCreationService } from "@app/services/game-creation/game-creation.service";
import { PathRoute } from "@common/interfaces/route";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { LucideAngularModule, Link, Lock, Globe, Check } from "lucide-angular";
import { GameState } from "@common/constants";

@Component({
  selector: "app-map-editor-page",
  standalone: true,
  templateUrl: "./map-editor-page.component.html",
  styleUrls: ["./map-editor-page.component.scss"],
  providers: [GameGridComponent],
  imports: [
    GameObjectsContainerComponent,
    FormsModule,
    GameGridComponent,
    ToolbarComponent,
    TranslateModule, 
    HeaderComponent,
    MatProgressSpinner,
    LucideAngularModule,
  ],
})
export class MapEditorPageComponent implements OnInit {
  @Input() selectedSize: string | null;
  @Output() selectedSizeChange = new EventEmitter<string>();
  @ViewChild("gameGrid") canvas: ElementRef<HTMLDivElement>;
  mapName: string = "";
  mapDescription: string = "";
  mapState: GameState = GameState.Private;
  maxLenMapTitle = MAX_LEN_MAP_TITLE;
  maxLenMapDescription = MAX_LEN_MAP_DESCRIPTION;
  resetTrigger: boolean = false;
  saveTrigger: boolean = false;
  isLoading: boolean = false;
  gameState = GameState;

  readonly Link = Link;
  readonly Lock = Lock;
  readonly Globe = Globe;
  readonly Check = Check;

  private items: number[][];
  private tiles: number[][];
  private height: number;
  private saveGameService = inject(SaveGameService);
  private mapEditorService = inject(MapEditorService);
  private gameCreationService = inject(GameCreationService);

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private translate: TranslateService
  ) {
    this.selectedSize = this.mapEditorService.getGridSize();
  }

  setGrid(newGrid: number[][]) {
    this.tiles = newGrid;
  }

  setItems(newItemPlacement: number[][]) {
    this.items = newItemPlacement;
  }

  setHeight(newHeight: number) {
    this.height = newHeight;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDragEnd() {
    this.mapEditorService.onDragEnd();
  }

  onDropOutside(event: DragEvent) {
    event.preventDefault();
    const gameObject = this.mapEditorService.getDraggedObject();
    if (this.mapEditorService.isDraggingFromContainer()) {
      return;
    }
    if (gameObject?.id) {
      this.mapEditorService.removeObjectFromGrid(gameObject);
    }
  }

  handleReset() {
    this.resetTrigger = true;
    if (!this.gameCreationService.isNewGame) {
      this.mapName = this.gameCreationService.loadedMapName;
      this.mapDescription = this.gameCreationService.loadedMapDescription;
      this.mapState = this.gameCreationService.loadedMapState;
    } else {
      this.mapName = "";
      this.mapDescription = "";
    }
    setTimeout(() => (this.resetTrigger = false), 0);
  }

  async handleSave() {
    // Trigger pour les composants enfants (immédiat)
    this.saveTrigger = true;

    // Sauvegarder (avec loading)
    await this.startSaving();
    setTimeout(() => (this.saveTrigger = false), 0);
  }
  handleExit() {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      disableClose: true,
      data: {
        title: this.translate.instant("DIALOG.TITLE.QUIT_PAGE"),
        messages: [
          this.translate.instant("DIALOG.MESSAGE.QUIT_MESSAGE_LOST_CHANGES"),
        ],
        options: [
          this.translate.instant("DIALOG.QUIT"),
          this.translate.instant("DIALOG.STAY"),
        ],
        confirm: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result.action === "left") {
        this.router.navigate([PathRoute.Admin]);
      }
    });
  }

  updateMapName(newName: string) {
    this.mapName = newName;
  }

  updateMapState(newState: GameState) {
    this.mapState = newState;
  }

  updateMapDescription(newDescription: string) {
    this.mapDescription = newDescription;
  }

  ngOnInit() {
    if (!this.mapEditorService.isMapChosen()) {
      this.router.navigate([PathRoute.Admin]);
    }

    if (!this.gameCreationService.isNewGame) {
      this.mapName = this.gameCreationService.loadedMapName;
      this.mapDescription = this.gameCreationService.loadedMapDescription;
      this.mapState = this.gameCreationService.loadedMapState;
    }
  }
  private async startSaving() {
    this.isLoading = true;

    try {
      const canvas = await html2canvas(this.canvas.nativeElement, {
        scale: 0.2,
      });
      const baseImage = canvas.toDataURL();

      const infoTransferred: Info = {
        image: baseImage,
        name: this.mapName.trim(),
        description: this.mapDescription,
        grid: this.tiles,
        items: this.items,
        height: this.height,
        state: this.mapState,
        creatorId: this.gameCreationService.loadedMapCreatorId,
        creatorUsername: this.gameCreationService.loadedMapCreatorUsername,
        mode: this.gameCreationService.isNewGame
          ? this.gameCreationService.getGameMode()
          : this.mapEditorService.mapToEdit.mode,
      };

      if (this.mapEditorService.isMapValid()) {
        if (this.gameCreationService.isNewGame) {
          await this.saveGameService.saveNewGame(infoTransferred);
        } else {
          await this.saveGameService.replaceMap(
            infoTransferred,
            this.mapEditorService.mapToEdit._id
          );
        }
        this.dialog.open(SimpleDialogComponent, {
          disableClose: true,
          data: {
            messages: [
              this.translate.instant("MAP_VALIDATOR.REDIRECT_MESSAGE"),
            ],
            title: "MAP_VALIDATOR.SAVE_SUCCESS",
          },
        });
      }
    } catch (error: any) {
      console.log("Save error:", error);
      // Show error dialog
      this.dialog.open(SimpleDialogComponent, {
        disableClose: true,
        data: {
          messages: [
            error?.message ||
              this.translate.instant("MAP_VALIDATOR.SAVE_ERROR"),
          ],
          title: "MAP_VALIDATOR.ERROR_TITLE",
        },
      });
    } finally {
      this.isLoading = false;
    }
  }
}
