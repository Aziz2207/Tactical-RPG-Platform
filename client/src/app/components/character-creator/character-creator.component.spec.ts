import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
    DEFAULT_ACTION_POINT,
    DEFAULT_ATTRIBUTE,
    DEFAULT_EVASION_POINT,
    DICE_6,
    ErrorMessages,
    HIGH_ATTRIBUTE,
    MESSAGE_DURATION_VALIDATION_ERROR,
} from '@app/constants';
import { defaultPostGameStats } from '@app/default-attributes';
import { mockAvatar, mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { AttributesService } from '@app/services/attributes/attributes.service';
import { Behavior, Status } from '@common/interfaces/player';
import { CharacterCreatorComponent } from './character-creator.component';
import SpyObj = jasmine.SpyObj;

describe('CharacterCreatorComponent', () => {
    let component: CharacterCreatorComponent;
    let fixture: ComponentFixture<CharacterCreatorComponent>;
    let attributesServiceSpy: SpyObj<AttributesService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        attributesServiceSpy = jasmine.createSpyObj('AttributesService', [
            'setCharacterName',
            'setHealth',
            'setSpeed',
            'setAttack',
            'setDefense',
            'isButtonSelected',
            'getAttributeValue',
            'getAttributes',
            'resetAttributes',
            'getDiceMessage',
            'saveAttributesValue',
        ]);
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [MatSnackBarModule, BrowserAnimationsModule],
            providers: [
                { provide: AttributesService, useValue: attributesServiceSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(CharacterCreatorComponent);
        component = fixture.componentInstance;
        fixture.autoDetectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit closeCharacterCreator event and call resetAttributes when closeComponent is called', () => {
        spyOn(component.closeCharacterCreator, 'emit');
        spyOn(component, 'setAttributes');
        component.closeComponent();

        expect(component.closeCharacterCreator.emit).toHaveBeenCalled();
        expect(attributesServiceSpy.resetAttributes).toHaveBeenCalled();
        expect(component.setAttributes).toHaveBeenCalled();
    });

    it('should update clickedAvatar when getClickedImage is called', () => {
        const testAvatar = { src: 'Zeus.jpg', name: 'Zeus' };
        component.getClickedImage(testAvatar);
        expect(component.clickedAvatar).toEqual(testAvatar);
    });

    it('should set clickedAvatar to false when no avatar is clicked', () => {
        const avatar1 = { src: 'Zeus.jpg', name: 'Zeus', isSelected: false };
        const avatar2 = { src: 'Athena.jpg', name: 'Athena', isSelected: false };
        component.clickedAvatar = avatar1;
        component.clickedAvatar.isSelected = true;
        spyOn(component.selectCharacter, 'emit');
        component.getClickedImage(avatar2);

        expect(component.clickedAvatar).toBe(avatar2);
        expect(avatar1.isSelected).toBe(false);
        expect(avatar2.isSelected).toBe(true);
        expect(component.selectCharacter.emit).toHaveBeenCalledWith(avatar2);
    });

    it('should set characterName to ABC when setName is called with ABC', () => {
        component.setName('ABC');
        expect(component.characterName).toEqual('ABC');
    });

    it('should set health when addHealth is called', () => {
        component.addHealth();
        expect(attributesServiceSpy.setHealth).toHaveBeenCalled();
    });

    it('should set speed when addSpeed is called', () => {
        component.addSpeed();
        expect(attributesServiceSpy.setSpeed).toHaveBeenCalled();
    });

    it('should call setAttack with the correct dice value', () => {
        component.setAttack('attack4');
        expect(attributesServiceSpy.setAttack).toHaveBeenCalledWith('attack4');
    });

    it('should call setDefense with the correct dice value', () => {
        const diceValue = 'defense4';
        component.setDefense(diceValue);
        expect(attributesServiceSpy.setDefense).toHaveBeenCalledWith(diceValue);
    });

    it('should return the dice message from attributesService', () => {
        attributesServiceSpy.getDiceMessage.and.returnValue(DICE_6);
        const result = component.diceDisplay('atkDiceMax');

        expect(attributesServiceSpy.getDiceMessage).toHaveBeenCalledWith('atkDiceMax');
        expect(result).toBe(DICE_6);
    });

    describe('saveChoices', () => {
        it('should call saveAttributesValue when saveChoices is called', () => {
            component.clickedAvatar = mockAvatar;
            spyOn(component.confirmCharacterSelection, 'emit');
            spyOn(component, 'setAttributes');
            spyOn(component, 'createPlayer');

            attributesServiceSpy.saveAttributesValue.and.returnValue('');
            component.saveChoices();

            expect(attributesServiceSpy.saveAttributesValue).toHaveBeenCalled();
            expect(component.confirmCharacterSelection.emit).toHaveBeenCalled();
            expect(component.setAttributes).toHaveBeenCalled();
            expect(component.createPlayer).toHaveBeenCalled();
        });

        it('should return if no avatar is clicked', () => {
            component.saveChoices();
            expect(snackBarSpy.open).toHaveBeenCalledWith(ErrorMessages.MissingAvatar, 'Fermer', {
                duration: MESSAGE_DURATION_VALIDATION_ERROR,
            });
        });

        it('should not emit closeCharacterCreator if missing attribute', () => {
            component.clickedAvatar = mockAvatar;
            spyOn(component.confirmCharacterSelection, 'emit');
            attributesServiceSpy.saveAttributesValue.and.returnValue(ErrorMessages.MissingAttributes);
            component.saveChoices();

            expect(snackBarSpy.open).toHaveBeenCalledWith(ErrorMessages.MissingAttributes, 'Fermer', {
                duration: MESSAGE_DURATION_VALIDATION_ERROR,
            });
            expect(component.confirmCharacterSelection.emit).not.toHaveBeenCalled();
        });
    });

    it('should set attributes from attributesService', () => {
        const mockAttributes = {
            totalHp: DEFAULT_ATTRIBUTE,
            currentHp: DEFAULT_ATTRIBUTE,
            speed: HIGH_ATTRIBUTE,
            movementPointsLeft: HIGH_ATTRIBUTE,
            maxActionPoints: DEFAULT_ACTION_POINT,
            actionPoints: DEFAULT_ACTION_POINT,
            attack: DEFAULT_ATTRIBUTE,
            atkDiceMax: HIGH_ATTRIBUTE,
            defense: DEFAULT_ATTRIBUTE,
            defDiceMax: DEFAULT_ATTRIBUTE,
            evasion: DEFAULT_EVASION_POINT,
        };
        attributesServiceSpy.getAttributes.and.returnValue(mockAttributes);
        component.setAttributes();

        expect(component.attributes).toEqual(mockAttributes);
    });

    it('should create a player with the correct attributes', () => {
        component.characterName = 'Test Character';
        component.clickedAvatar = mockAvatar;
        component.attributes = mockLobbyPlayers[0].attributes;

        component.createPlayer();

        expect(component.player).toBeDefined();
        expect(component.player).toEqual({
          id: "test",
          uid: "test",
          attributes: component.attributes,
          avatar: component.clickedAvatar,
          isActive: false,
          name: component.characterName,
          status: Status.Player,
          inventory: [],
          position: { x: -1, y: -1 },
          behavior: Behavior.Sentient,
          spawnPosition: { x: -1, y: -1 },
          postGameStats: defaultPostGameStats,
          positionHistory: [],
          collectedItems: [],
        });
    });

    it('should prevent space and show error message when space key is pressed', () => {
        const mockEvent: KeyboardEvent = {
            key: ' ',
            preventDefault: jasmine.createSpy('preventDefault'),
        } as unknown as KeyboardEvent;

        component.preventSpace(mockEvent);
        expect(snackBarSpy.open).toHaveBeenCalledWith('Le nom ne peut pas contenir des espaces', 'Fermer', {
            duration: MESSAGE_DURATION_VALIDATION_ERROR,
        });
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should remove spaces from characterName', () => {
        component.characterName = 'Test Name';
        component.removeSpaces();
        expect(component.characterName).toBe('TestName');
    });
});
