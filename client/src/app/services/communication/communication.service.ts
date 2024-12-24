import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Game } from '@common/interfaces/game';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class CommunicationService {
    private readonly baseUrl: string = environment.serverUrl;
    private readonly gameUrl: string = '/game';
    private readonly gamesUrl: string = '/game/all';

    constructor(private readonly http: HttpClient) {}

    gamePut(game: Game): Observable<HttpResponse<string>> {
        return this.http.put(`${this.baseUrl}${this.gameUrl}`, game, { observe: 'response', responseType: 'text' }).pipe(
            catchError((error: HttpErrorResponse) => {
                return throwError(() => new Error(JSON.parse(error.error).message));
            }),
        );
    }

    gameGet(id: string): Observable<Game> {
        return this.http.get<Game>(`${this.baseUrl}${this.gameUrl}/${id}`).pipe(catchError(this.handleError<Game>('gameGet')));
    }

    gamesGet(): Observable<{ title: string; _id: string; isVisible: boolean }[]> {
        return this.http
            .get<{ title: string; _id: string; isVisible: boolean }[]>(`${this.baseUrl}${this.gamesUrl}`)
            .pipe(catchError(this.handleError<{ title: string; _id: string; isVisible: boolean }[]>('gamesGet')));
    }

    gameDelete(id: string): Observable<object> {
        return this.http.delete(`${this.baseUrl}${this.gameUrl}/${id}`).pipe(catchError(this.handleError<object>('gameDelete')));
    }

    gamePatch(
        id: string,
        patchData: {
            title?: string;
            desc?: string;
            mode?: string;
            isVisible?: boolean;
            size?: number;
        },
    ): Observable<Game> {
        return this.http.patch<Game>(`${this.baseUrl}${this.gameUrl}/${id}`, patchData).pipe(catchError(this.handleError<Game>('gamePatch')));
    }

    exportGame(id: string): Observable<Game> {
        return this.http.get<Game>(`${this.baseUrl}/game/${id}/export`).pipe(catchError(this.handleError<Game>('exportGame')));
    }

    importGame(game: Game): Observable<void | Game> {
        if ('_id' in game) {
            delete game._id;
        }
        game.isVisible = false;
        game.map._size = Number(game.map._size);
        return this.http.put<Game>(`${this.baseUrl}${this.gameUrl}/import`, game).pipe(
            catchError((error: HttpErrorResponse) => {
                return throwError(() => error);
            }),
        );
    }

    private handleError<T>(request: string, result?: T) {
        return (): Observable<T> => {
            return of(result as T);
        };
    }
}
