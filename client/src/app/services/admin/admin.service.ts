import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CommunicationService } from '@app/services/communication/communication.service';
import { CONSTANTS } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AdminService {
    importMessage$: Subject<string> = new Subject<string>();
    newGame: { size: number; mode: string };
    currentGameID: string;
    stateSelection$: Observable<Game | undefined>;
    stateList$: Observable<{ title: string; _id: string; isVisible: boolean }[] | undefined>;
    private _gameList: BehaviorSubject<{ title: string; _id: string; isVisible: boolean }[] | undefined> = new BehaviorSubject<
        { title: string; _id: string; isVisible: boolean }[] | undefined
    >(undefined);

    private _internalList: { title: string; _id: string; isVisible: boolean }[] = [];
    private _selectedGameSubject: BehaviorSubject<Game | undefined> = new BehaviorSubject<Game | undefined>(undefined);

    constructor(private communicationService: CommunicationService) {
        this.stateSelection$ = this._selectedGameSubject.asObservable();
        this.stateList$ = this._gameList.asObservable();

        this._gameList.subscribe((games) => {
            if (games && games.length > 0) {
                this._internalList = games;
            }
        });
        this.getGames();
    }

    selectGame(id: string): void {
        this.communicationService.gameGet(id).subscribe((game) => {
            this._selectedGameSubject.next(game);
            if (game && game._id) {
                this.currentGameID = game._id;
            }
        });
    }

    toggleVisibility(id: string): void {
        if (this._internalList) {
            const gameSelect = this._internalList.find((game) => game._id === id);
            if (gameSelect) {
                this.communicationService.gamePatch(id, { isVisible: !gameSelect.isVisible }).subscribe(() => {
                    this.reset();
                });
            }
        }
    }

    deleteGame(id: string) {
        this.communicationService.gameDelete(id).subscribe(() => {
            this.reset();
        });
    }

    addGame(size: number, mode: string) {
        this.newGame = {
            size,
            mode,
        };
    }

    reset() {
        const currentGameID = this.currentGameID;
        this.getGames();
        if (currentGameID) {
            this.selectGame(currentGameID);
        }
    }

    exportGame(id: string): void {
        this.communicationService.exportGame(id).subscribe((game) => {
            const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `${game.title || 'game'}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        });
    }

    importGame(game: Game, onConflict: (conflictingGame: Game) => void): void {
        this.communicationService.importGame(game).subscribe({
            next: () => {
                this.reset();
                this.importMessage$.next('Importation réussie !');
            },
            error: (err: HttpErrorResponse) => {
                if (err.status === CONSTANTS.ERROR_CONFLICT) {
                    onConflict(game);
                } else if (err.status === CONSTANTS.ERROR_BAD_REQUEST && err.error.errors) {
                    this.importMessage$.next(`Erreur lors de l'importation :\n${err.error.errors.join('\n')}`);
                } else {
                    this.importMessage$.next(`Erreur lors de l'importation : ${err.error || err.message}`);
                }
            },
        });
    }

    private getGames(): void {
        this.communicationService.gamesGet().subscribe((games) => {
            this._gameList.next(games);
        });
    }
}
