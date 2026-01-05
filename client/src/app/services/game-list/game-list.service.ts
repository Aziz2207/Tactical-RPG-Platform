import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Game } from "@common/interfaces/game";
import { BehaviorSubject, Observable, from, firstValueFrom, of } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { FireAuthService } from "../user-account/fire-auth/fire-auth.service";
import { GameState } from "@common/constants";

@Injectable({
  providedIn: "root",
})
export class GameListService {
  selectedGameSubject = new BehaviorSubject<Game | null>(null);
  chosenGameSubject = new BehaviorSubject<Game | null>(null);
  private allMapsApiUrl = `${environment.serverUrl}/maps`;
  private visibleMapsUrl = `${this.allMapsApiUrl}/visible`;
  private duplicateMapUrl = `${this.allMapsApiUrl}/duplicate`;

  constructor(
    private http: HttpClient,
    private authService: FireAuthService
  ) {}

  getGames(usingPage: string): Observable<Game[]> {
    return usingPage === "game-list"
      ? this.getAllVisibleGames()
      : this.getAllGames();
  }

  getAllVisibleGames(): Observable<Game[]> {
    return from(this.authService.getToken()).pipe(
      switchMap((token) => {
        return this.http.get<Game[]>(this.visibleMapsUrl, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });
      })
    );
  }

  getAllGames(): Observable<Game[]> {
    return from(this.authService.getToken()).pipe(
      switchMap((token) => {
        return this.http.get<Game[]>(this.allMapsApiUrl, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });
      })
    );
  }

  setSelectedGame(usingPage: string, game: Game, games: Game[]) {
    if (usingPage === "game-list") {
      if (game.isSelected) {
        this.deselectGame(games);
      } else {
        this.selectGame(game, games);
      }
    }
  }

  selectGame(game: Game, games: Game[]) {
    this.deselectGame(games);
    this.selectedGameSubject.next(game);
    game.isSelected = true;
  }

  deselectGame(games: Game[]) {
    this.selectedGameSubject.next(null);
    games.forEach((game) => (game.isSelected = false));
  }
  async deleteGame(game: Game): Promise<void> {
    const exists = await this.checkIfGameExists(game);
    if (!exists) {
      throw new Error('Game does not exist');
    }
    return this.performDeleteGame(game);
  }

  async checkIfGameExists(game: Game): Promise<boolean> {
    try {
      const games = await firstValueFrom(this.getAllGames());
      return games.some((g) => g._id === game._id);
    } catch (error) {
      return false;
    }
  }

  checkIfVisibleGameExists(game: Game): Observable<Game | null> {
    return this.getAllVisibleGames().pipe(
      map((games: Game[]) => games.find((g) => g._id === game._id) || null),
      catchError(() => of(null))
    );
  }

  private async performDeleteGame(game: Game): Promise<void> {
      const token = await this.authService.getToken();
      await firstValueFrom(
        this.http.delete<void>(`${this.allMapsApiUrl}/${game._id}`, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
  }

async duplicateGame(game: Game): Promise<void> {
  const exists = await this.checkIfGameExists(game);
  if (!exists) {
    throw new Error('Game does not exist');
  }
  return this.performDuplicateGame(game);
}
  private async performDuplicateGame(game: Game): Promise<void> {
    const token = await this.authService.getToken();
    await firstValueFrom(
      this.http.post(
        `${this.duplicateMapUrl}/${game._id}`,
        {},
        {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        }
      )
    );
  }

  async changeGameState(game: Game, gameState: GameState): Promise<void> {
    const exists = await this.checkIfGameExists(game);
     if (!exists) {
    throw new Error('Game does not exist');
  }
    return this.performChangeGameState(game, gameState);
  }
  async performChangeGameState(
    game: Game,
    gameState: GameState
  ): Promise<void> {
    const url = `${this.allMapsApiUrl}/${game._id}`;
    const updateData = { state: gameState };
    const token = await this.authService.getToken();

    await firstValueFrom(
      this.http.patch<Game>(url, updateData, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      })
    );
  }
}
