import { Injectable } from '@angular/core';
import { ReducedGame } from '@app/interfaces/reduced-game';
import { CommunicationService } from '@app/services/communication/communication.service';
import { Game } from '@common/interfaces/game';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class StartGameService {
    stateSelection$: Observable<Game | undefined>;
    stateList$: Observable<ReducedGame[] | undefined>;
    private _internalList: ReducedGame[] = []; // Only visible games
    private _gameList: BehaviorSubject<ReducedGame[] | undefined> = new BehaviorSubject<ReducedGame[] | undefined>(undefined);
    private _selectedGameSubject: BehaviorSubject<Game | undefined> = new BehaviorSubject<Game | undefined>(undefined);

    constructor(private communicationService: CommunicationService) {
        this.stateSelection$ = this._selectedGameSubject.asObservable();
        this.stateList$ = this._gameList.asObservable();
        this._gameList.subscribe((games) => {
            if (games && games.length > 0) {
                this._internalList = games;
                this.selectGame(this._internalList[0]._id);
            }
        });
        this.getGames();
    }

    getGames(): void {
        this.communicationService.gamesGet().subscribe((games) => {
            const visibleGames = games.filter((game) => game.isVisible);
            this._gameList.next(visibleGames);
            if (visibleGames.length === 0) {
                this._selectedGameSubject.next(undefined); // Case all games are deleted/ hidden
            } else {
                this.selectGame(visibleGames[0]._id);
            }
        });
    }

    selectGame(id: string): void {
        this.communicationService.gameGet(id).subscribe((game) => {
            this._selectedGameSubject.next(game);
        });
    }

    reset(): void {
        this.getGames();
    }
}
