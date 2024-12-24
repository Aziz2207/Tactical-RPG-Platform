import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Character } from '@app/classes/character';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CharacterService {
    takenCharacters: string[] = [];
    state$: Observable<Character | undefined>;
    private selectedCharacterSubject: BehaviorSubject<Character | undefined> = new BehaviorSubject<Character | undefined>(undefined);

    constructor(
        private http: HttpClient,
        private roomManagerService: RoomManagerService,
    ) {
        this.state$ = this.selectedCharacterSubject.asObservable();
        if (this.roomManagerService.room) {
            this.roomManagerService.takenCharacters$.subscribe((takenCharacters) => {
                this.takenCharacters = takenCharacters;
            });
        }
    }

    getCharacters(): Observable<Character[]> {
        return this.http.get<Character[]>('./assets/characters.json');
    }

    selectCharacter(type: string): void {
        this.getCharacters().subscribe((characters) => {
            const selectedCharacter = characters.find((character) => character.type === type);
            this.selectedCharacterSubject.next(selectedCharacter);
        });
    }

    getCharacter(type: string): Observable<Character | undefined> {
        return this.getCharacters().pipe(map((characters: Character[]) => characters.find((character) => character.type === type)));
    }

    reset(): void {
        this.selectedCharacterSubject.next(undefined);
    }
}
