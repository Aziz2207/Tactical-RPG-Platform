import { CommonModule, NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Character } from '@app/classes/character';
import { CharacterService } from '@app/services/character/character.service';

@Component({
    selector: 'app-character-caroussel',
    standalone: true,
    templateUrl: './character-caroussel.component.html',
    imports: [CommonModule, NgClass],
    styleUrls: ['./character-caroussel.component.scss'],
})
export class CharacterCarousselComponent implements OnInit, OnDestroy {
    characterList: Character[] = [];
    selectedCharacter: Character | undefined;

    constructor(private characterService: CharacterService) {}

    ngOnInit(): void {
        this.characterService.getCharacters().subscribe((characters) => {
            this.characterList = characters;
        });
        this.characterService.state$.subscribe((state) => {
            this.selectedCharacter = state;
        });
    }

    ngOnDestroy(): void {
        this.characterService.reset();
    }

    isCharacterTaken(type: string) {
        return this.characterService.takenCharacters.includes(type);
    }

    selectCharacter(type: string) {
        if (!this.isCharacterTaken(type)) {
            this.characterService.selectCharacter(type);
        }
    }
}
