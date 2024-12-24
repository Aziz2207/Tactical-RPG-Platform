import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Character } from '@app/classes/character';
import { CharacterService } from '@app/services/character/character.service';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { Attributes } from '@common/interfaces/attributes';
import { Player } from '@common/interfaces/player';
import { of } from 'rxjs';
import { CharacterDisplayComponent } from './character-display.component';

describe('CharacterDisplayComponent', () => {
    let component: CharacterDisplayComponent;
    let fixture: ComponentFixture<CharacterDisplayComponent>;
    let mockCharacterService: jasmine.SpyObj<CharacterService>;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockCharacter: Character;

    beforeEach(async () => {
        mockCharacter = { type: 'guy', image: '', icon: '', description: 'desc', isTaken: false };
        mockCharacterService = jasmine.createSpyObj('CharacterService', ['state$', 'reset']);
        mockCharacterService.state$ = of(mockCharacter);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['sendPlayerInfos', 'getRoom', 'getPlayer', 'leaveRoom']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'isSocketAlive']);
        mockSocketService.isSocketAlive.and.returnValue(true);

        const mockAttributes: Attributes = {
            speedPoints: 4,
            currentSpeed: 4,
            lifePoints: 8,
            currentHP: 8,
            offensePoints: 8,
            defensePoints: 4,
            diceChoice: 'attack',
            actionLeft: 1,
        };

        const mockPlayer = {
            isHost: true,
            socketId: '1234',
            userName: 'Player1',
            attributes: mockAttributes,
            characterType: 'guy',
            nbWins: 0,
            isAlive: true,
        } as unknown as Player;

        const mockRoom = { code: '1234', players: [mockPlayer], isLocked: true, maxPlayers: 4, takenCharacters: [], isActive: false };
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);
        mockRoomManagerService.getPlayer.and.returnValue(mockPlayer);

        await TestBed.configureTestingModule({
            imports: [CharacterDisplayComponent],
            providers: [
                { provide: CharacterService, useValue: mockCharacterService },
                { provide: Router, useValue: mockRouter },
                { provide: RoomManagerService, useValue: mockRoomManagerService },
                { provide: MatDialog, useValue: mockDialog },
                { provide: SocketService, useValue: mockSocketService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterDisplayComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have a selected character on init', () => {
        expect(component.selectedCharacter).toEqual(mockCharacter);
    });

    it('should set cantJoinMessage when validAttributes is false', () => {
        component.validAttributes = false;
        component.userName = 'Player1';
        component.joinGame();
        expect(component.cantJoinMessage).toEqual('Veuillez sélectionner un bonus et un dé avant de rejoindre la partie.');
    });

    it('should set cantJoinMessage when userName is empty', () => {
        component.validAttributes = true;
        component.userName = '';
        component.joinGame();
        expect(component.cantJoinMessage).toEqual("Veuillez entrer un nom d'utilisateur.");
    });

    it('should set cantJoinMessage when userName is just spaces', () => {
        component.validAttributes = true;
        component.userName = '   ';
        component.joinGame();
        expect(component.cantJoinMessage).toEqual("Nom d'utilisateur invalide.");
    });

    it('should set cantJoinMessage when no character is selected', () => {
        component.validAttributes = true;
        component.userName = 'Player1';
        component.selectedCharacter = undefined;
        component.joinGame();
        expect(component.cantJoinMessage).toEqual('Veuillez choisir un avatar.');
    });

    it('should navigate to /wait if all inputs are valid and room is not locked', () => {
        component.validAttributes = true;
        component.userName = 'Player1';
        component.selectedCharacter = mockCharacter;

        const mockRoom = { code: '1234', players: [], isLocked: false, maxPlayers: 4, takenCharacters: [], isActive: false };
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);

        component.joinGame();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/wait']);
    });

    it('should set attributes when setAttributes is called', () => {
        const attributes = {
            speedPoints: 4,
            lifePoints: 8,
            offensePoints: 8,
            defensePoints: 4,
            diceChoice: 'attack',
            currentHP: 8,
        } as Attributes;

        component.setAttributes(attributes);
        expect(component.attributes).toEqual(attributes);
    });

    it('should remove the cantJoinMessage when validAttributes is true', () => {
        component.cantJoinMessage = 'message';
        component.validAttributesChanged(true);
        expect(component.validAttributes).toBeTrue();
        expect(component.cantJoinMessage).toEqual('');
    });

    it('should not navigate to /wait if userName is invalid', () => {
        component.validAttributes = true;
        component.userName = '';
        component.joinGame();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
});
