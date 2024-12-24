import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameService, GameState } from '@app/services/game/game.service';
import { Attributes } from '@common/interfaces/attributes';
import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { ItemEnum } from '@common/item-enum';
import { ModeEnum } from '@common/mode-enum';
import { InventoryComponent } from './inventory.component';

describe('InventoryComponent', () => {
    let component: InventoryComponent;
    let fixture: ComponentFixture<InventoryComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGameState: GameState;

    const mockAttributes = { speedPoints: 4, lifePoints: 8, offensePoints: 8, defensePoints: 4 } as Attributes;
    let mockItems = [
        { id: 1, itemType: ItemEnum.Potion, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
        { id: 1, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
    ] as Item[];

    const mockPlayer: Player = {
        isHost: true,
        socketId: '1234',
        userName: 'Player1',
        attributes: mockAttributes,
        characterType: 'logiciel',
        nbWins: 0,
        hasActed: false,
        inventory: mockItems,
    } as unknown as Player;

    const mockMap: Map = {
        _tiles: [],
        _size: 10,
        _items: [],
        mode: ModeEnum.BR,
    };

    beforeEach(async () => {
        mockGameState = {
            player: mockPlayer,
            activePlayer: undefined,
            nextPlayer: undefined,
            players: [mockPlayer],
            time: 0,
            yourTurn: false,
            map: mockMap,
            actionMode: false,
            debugMode: signal(false),
        };

        // Create a spy for GameService
        mockGameService = jasmine.createSpyObj('GameService', ['setInventoryDialogHandler', 'handleInventory']);
        mockGameService.gameState = mockGameState;
        mockGameService.handleInventory = jasmine.createSpy('handleInventory').and.callFake(() => {});

        await TestBed.configureTestingModule({
            imports: [InventoryComponent], // This should import the component directly as it's standalone
            providers: [{ provide: GameService, useValue: mockGameService }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(InventoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges(); // Trigger initial change detection
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize gameState on ngOnInit', () => {
        component.ngOnInit();
        expect(component.gameState).toBe(mockGameState); // Check if the gameState is initialized correctly
    });

    it('should set isVisible to true when setInventoryDialogHandler is called', () => {
        const mockItem: Item[] = [
            {
                id: 1,
                itemType: ItemEnum.ABomb,
                imgSrc: '',
                isRandom: false,
                isOnGrid: false,
                description: '',
                hasEffect: false,
            },
        ];
        component.ngOnInit();
        const handler = mockGameService.setInventoryDialogHandler.calls.mostRecent().args[0]; // Get the last called handler function
        handler(mockItem);
        expect(component.isVisible).toBeTrue();
    });

    it('should call handleInventory and set isVisible to false when rejectItem is called', () => {
        const mockItem: Item = {
            id: 1,
            itemType: ItemEnum.ABomb,
            imgSrc: '',
            isRandom: false,
            isOnGrid: false,
            description: '',
            hasEffect: false,
        };

        component.rejectItem(mockItem);

        // Check that handleInventory was called
        expect(mockGameService.handleInventory).toHaveBeenCalledWith(mockItem);

        // Check that isVisible was set to false
        expect(component.isVisible).toBeFalse();
    });
});
