import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ClientMap } from '@app/classes/map';
import { CommunicationService } from '@app/services/communication/communication.service';
import { Game } from '@common/interfaces/game';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class SaveGameService {
    errorMessage$: Subject<string> = new Subject<string>();
    existingGameNames: string[] = [];
    private gameName: string;
    private gameDescription: string;
    private gamePrev: string = '';
    private gameMap: ClientMap;
    private game: Game;
    private _idExistingGame: string | undefined;

    constructor(
        private communicationService: CommunicationService,
        private router: Router,
    ) {}

    createGame() {
        this.game = {
            title: this.gameName,
            map: this.gameMap,
            size: Number(this.gameMap._size),
            description: this.gameDescription,
            prevImg: this.gamePrev,
            isVisible: false,
        };

        if (this._idExistingGame) {
            this.game._id = this._idExistingGame;
        }

        this.communicationService.gamePut(this.game).subscribe({
            next: () => {
                this.resetId();
                this.router.navigate(['/admin']);
            },
            error: (error) => {
                this.errorMessage$.next(error.message);
            },
        });
    }

    addInfo(map: ClientMap | null, gameName: string, gameDescription: string) {
        if (map) {
            this.gameMap = map;
            this.gameName = gameName;
            this.gameDescription = gameDescription;
        }
    }

    storeId(id: string) {
        this._idExistingGame = id;
    }

    resetId() {
        this._idExistingGame = undefined;
    }

    addGamePrev(img: string) {
        this.gamePrev = img;
    }
}
