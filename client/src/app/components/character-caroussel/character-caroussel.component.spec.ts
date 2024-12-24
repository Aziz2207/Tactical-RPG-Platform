import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Character } from '@app/classes/character';
import { CharacterService } from '@app/services/character/character.service';
import { SocketService } from '@app/services/socket/socket.service';
import { of } from 'rxjs';
import { CharacterCarousselComponent } from './character-caroussel.component';

describe('CharacterCarousselComponent', () => {
    let component: CharacterCarousselComponent;
    let fixture: ComponentFixture<CharacterCarousselComponent>;
    let mockCharacterService: jasmine.SpyObj<CharacterService>;
    let mockCharacter1: Character;
    let mockCharacter2: Character;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockHttp;

    beforeEach(async () => {
        mockCharacter1 = { type: 'guy', image: '', icon: '', description: 'desc', isTaken: false };
        mockCharacter2 = { type: 'girl', image: '', icon: '', description: 'desc2', isTaken: false };

        mockCharacterService = jasmine.createSpyObj('CharacterService', ['getCharacters', 'selectCharacter', 'enableListeneners', 'reset']);
        mockCharacterService.getCharacters.and.returnValue(of([mockCharacter1, mockCharacter2]));
        mockCharacterService.state$ = of(mockCharacter1);
        mockCharacterService.takenCharacters = [];
        mockHttp = jasmine.createSpyObj('HttpClient', ['get']);
        mockSocketService = jasmine.createSpyObj('SocketService', ['on']);

        await TestBed.configureTestingModule({
            imports: [CharacterCarousselComponent],
            providers: [
                { provide: CharacterService, useValue: mockCharacterService },
                { provide: HttpClient, useValue: mockHttp },
                { provide: SocketService, useValue: mockSocketService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterCarousselComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', async () => {
        expect(component).toBeTruthy();
    });

    it('should have the correct character list', () => {
        expect(component.characterList.length).toBe(2);
        expect(component.characterList).toContain(mockCharacter1);
        expect(component.characterList).toContain(mockCharacter2);
    });

    it('on init should have selected character', () => {
        expect(component.selectedCharacter).toEqual(mockCharacter1);
    });

    it('should change the selected character', () => {
        mockCharacterService.state$ = of(mockCharacter2);
        component.ngOnInit();
        expect(component.selectedCharacter).toEqual(mockCharacter2);
    });

    it('should select a character', () => {
        component.selectCharacter('girl');
        expect(mockCharacterService.selectCharacter).toHaveBeenCalledWith('girl');
    });
});
