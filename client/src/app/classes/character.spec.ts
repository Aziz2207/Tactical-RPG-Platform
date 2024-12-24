import { Character } from './character';

describe('Character', () => {
    let character: Character;

    beforeEach(() => {
        character = new Character();
        character.type = 'test';
        character.image= 'test.png';
        character.icon = 'testIcon.png';
        character.description = 'test description';
    });

    it('should create', () => {
        expect(character).toBeTruthy();
    });

    it('should have the correct attributes', () => {
        expect(character.type).toBe('test');
        expect(character.image).toBe('test.png');
        expect(character.icon).toBe('testIcon.png');
        expect(character.description).toBe('test description');
    });
});
