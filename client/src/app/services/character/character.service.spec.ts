import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Character } from '@app/classes/character';
import { CharacterService } from '@app/services/character/character.service';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { BehaviorSubject, of } from 'rxjs';

describe('CharacterService', () => {
    let service: CharacterService;
    const mockHttpClient = jasmine.createSpyObj('HttpClient', ['get']);
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;
    const mockCharacterList: Character[] = [
        { type: 'guy', image: '', icon: '', description: 'desc', isTaken: false },
        { type: 'girl', image: '', icon: '', description: 'desssc', isTaken: false },
        { type: 'jerk', image: '', icon: '', description: 'descrty', isTaken: false },
    ];

    beforeEach(() => {
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['room'], {
            takenCharacters$: new BehaviorSubject<string[]>([]),
        });
        mockRoomManagerService.room = { code: '1234', takenCharacters: [], players: [], isLocked: true, maxPlayers: 6, isActive: true };

        TestBed.configureTestingModule({
            providers: [
                CharacterService,
                { provide: RoomManagerService, useValue: mockRoomManagerService },
                { provide: HttpClient, useValue: mockHttpClient },
            ],
        });

        service = TestBed.inject(CharacterService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should select a character', (done) => {
        spyOn(service, 'getCharacters').and.returnValue(of(mockCharacterList));

        service.selectCharacter('guy');
        service.state$.subscribe((selected) => {
            expect(selected?.type).toBe('guy');
            expect(selected?.description).toBe('desc');
            done();
        });
    });

    it('should handle selecting a character that does not exist', (done) => {
        spyOn(service, 'getCharacters').and.returnValue(of(mockCharacterList));

        service.selectCharacter('nonexistent');
        service.state$.subscribe((selected) => {
            expect(selected).toBeUndefined();
            done();
        });
    });

    it('should fetch the characters list from the server', (done) => {
        mockHttpClient.get.and.returnValue(of(mockCharacterList));

        service.getCharacters().subscribe((characters) => {
            expect(characters).toEqual(mockCharacterList);
            done();
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith('./assets/characters.json');
    });

    it('should get a specific character by type', (done) => {
        mockHttpClient.get.and.returnValue(of(mockCharacterList));

        service.getCharacter('girl').subscribe((character) => {
            expect(character?.type).toBe('girl');
            expect(character?.description).toBe('desssc');
            done();
        });
    });

    it('should return undefined for a non-existent character in getCharacter', (done) => {
        mockHttpClient.get.and.returnValue(of(mockCharacterList));

        service.getCharacter('nonexistent').subscribe((character) => {
            expect(character).toBeUndefined();
            done();
        });
    });

    it('should reset the selected character', (done) => {
        spyOn(service, 'getCharacters').and.returnValue(of(mockCharacterList));

        service.selectCharacter('guy');
        service.reset();

        service.state$.subscribe((selected) => {
            expect(selected).toBeUndefined();
            done();
        });
    });
});
