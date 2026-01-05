import { CommonModule, NgClass } from "@angular/common";
import { Component, inject, Input, OnDestroy, OnInit } from "@angular/core";
// import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { PAD_LENGTH } from "@app/constants";
import { GameMode, GameState } from "@common/constants";
import { GameCreationService } from "@app/services/game-creation/game-creation.service";
import { GameListService } from "@app/services/game-list/game-list.service";
import { MapEditorService } from "@app/services/map-editor/map-editor.service";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { Game } from "@common/interfaces/game";
import { PathRoute } from "@common/interfaces/route";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import {
  LucideAngularModule,
  Link,
  Lock,
  Globe,
  Settings,
  Check,
  CopyPlus,
  Pencil,
  Trash2,
  Grid3x3,
  Calendar,
  Sword,
  Flag,
} from "lucide-angular";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { ServerToClientEvent } from "@common/socket.events";
import { SimpleDialogComponent } from "../simple-dialog/simple-dialog.component";
import { MatDialog } from "@angular/material/dialog";
import { HttpErrorResponse } from "@angular/common/http";
import { MatMenuModule } from "@angular/material/menu";

@Component({
  selector: "app-game-list",
  standalone: true,
  imports: [CommonModule, NgClass, TranslateModule, LucideAngularModule, MatMenuModule],
  templateUrl: "./game-list.component.html",
  styleUrl: "./game-list.component.scss",
})
export class GameListComponent implements OnInit, OnDestroy {
  @Input() usingPage: string = "";
  games: Game[] = [];
  gameSelected: Game | null = null;
  showVisibilityMenu: string | null = null;
  gameState = GameState;
  gameMode = GameMode;
  isLoading = false;

  readonly Link = Link;
  readonly Lock = Lock;
  readonly Globe = Globe;
  readonly Settings = Settings;
  readonly Check = Check;
  readonly CopyPlus = CopyPlus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly Grid3x3 = Grid3x3;
  readonly Calendar = Calendar;
  readonly Sword = Sword;
  readonly Flag = Flag;

  private mapEditorService = inject(MapEditorService);

  constructor(
    private gameListService: GameListService,
    // private snackBar: MatSnackBar,
    private router: Router,
    private gameCreationService: GameCreationService,
    private translate: TranslateService,
    private userAccountService: UserAccountService,
    private socketService: SocketCommunicationService,
    private dialog: MatDialog
  ) {}

  get accountDetails() {
    return this.userAccountService.accountDetails();
  }

  selectGame(game: Game) {
    this.gameListService.setSelectedGame(this.usingPage, game, this.games);
  }

  getGames() {
    this.isLoading = true;
    this.gameListService.getGames(this.usingPage).subscribe({
      next: (gamesFetched: Game[]) => {
        this.games = gamesFetched;
        this.isLoading = false;
      },
    });
  }

  getTrimedDate(game: Game) {
    const date = new Date(game.lastModification);

    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(PAD_LENGTH, "0") +
      "-" +
      String(date.getDate()).padStart(PAD_LENGTH, "0") +
      " " +
      String(date.getHours()).padStart(PAD_LENGTH, "0") +
      ":" +
      String(date.getMinutes()).padStart(PAD_LENGTH, "0")
    );
  }

  ngOnInit() {
    this.getGames();

    this.socketService.on(ServerToClientEvent.MapsListUpdated, () => {
      this.getGames();
    });
  }

  ngOnDestroy() {
    this.socketService.off(ServerToClientEvent.MapsListUpdated);
  }

  async deleteGame(game: Game) {
    try {
      await this.gameListService.deleteGame(game);
      // this.showSuccessMessage("Game deleted successfully");
    } catch (error: any) {
      if (error instanceof HttpErrorResponse) {
        this.showErrorMessage(error.error);
      } else {
        this.showErrorMessage(error.message);
      }
    }
  }

  async duplicateGame(game: Game) {
    try {
      await this.gameListService.duplicateGame(game);
      //  this.showSuccessMessage("Game duplicated successfully");
    } catch (error: any) {
      if (error instanceof HttpErrorResponse) {
        this.showErrorMessage(error.error);
      } else {
        this.showErrorMessage(error.message);
      }
    }
  }

  toggleGameStateMenu(event: Event, gameId: string): void {
    event.stopPropagation(); // Empêche la sélection du jeu
    this.showVisibilityMenu =
      this.showVisibilityMenu === gameId ? null : gameId;
  }

  async changeGameState(event: Event, game: Game, state: GameState) {
    event.stopPropagation();
    this.showVisibilityMenu = null;
    try {
      await this.gameListService.changeGameState(game, state);
      //  this.showSuccessMessage("Game state changed");
    } catch (error: any) {
      if (error instanceof HttpErrorResponse) {
        this.showErrorMessage(error.error);
      } else {
        this.showErrorMessage(error.message);
      }
    }
  }
  private showErrorMessage(message: string) {
    this.dialog.open(SimpleDialogComponent, {
      data: {
        title: this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
        messages: [message],
        options: [this.translate.instant("DIALOG.CLOSE")],
        confirm: false,
      },
    });
  }

  editGame(game: Game) {
    this.gameCreationService.isModifiable = true;
    this.mapEditorService.setMapToEdit(game);
    this.gameCreationService.setSelectedSize(
      this.gameCreationService.convertMapDimension(game)
    );
    this.gameCreationService.isNewGame = false;
    this.gameCreationService.loadedTiles = game.tiles;
    this.gameCreationService.loadedObjects = game.itemPlacement;

    this.gameCreationService.loadedMapName = game.name;
    this.gameCreationService.loadedMapDescription = game.description;
    this.gameCreationService.loadedMapState =
      game.state as unknown as GameState;
    this.gameCreationService.loadedMapCreatorId = game.creatorId!;
    this.gameCreationService.loadedMapCreatorUsername = game.creatorUsername!;

    this.selectGame(game);

    this.router.navigate([PathRoute.EditGame]);
  }

  refreshGameList() {
    this.gameListService.getAllGames().subscribe((games) => {
      this.games = games;
    });
  }
}
