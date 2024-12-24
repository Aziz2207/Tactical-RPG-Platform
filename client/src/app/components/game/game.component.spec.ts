import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombatService } from '@app/services/combat/combat.service';
import { GameService } from '@app/services/game/game.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { CONSTANTS } from '@common/constants';
import { Attributes } from '@common/interfaces/attributes';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { TileEnum } from '@common/tile-enum';
import { GameComponent } from './game.component';

describe('GameComponent', () => {
    let component: GameComponent;
    let fixture: ComponentFixture<GameComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockCombatService: jasmine.SpyObj<CombatService>;
    let mockPlayerMovementService: jasmine.SpyObj<PlayerMovementService>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['loadGame', 'isMyTurn', 'getSize']);
        mockCombatService = jasmine.createSpyObj('CombatService', ['startCombat', 'reset']);
        mockPlayerMovementService = jasmine.createSpyObj('PlayerMovementService', ['movePlayer', 'toggleDoor', 'findPath']);

        const mockAttributes: Attributes = {
            speedPoints: 4,
            currentSpeed: 4,
            lifePoints: 8,
            currentHP: 5,
            offensePoints: 8,
            defensePoints: 4,
            diceChoice: 'attack',
            actionLeft: 1,
        };

        const mockPlayers = [
            {
                userName: 'Lyna',
                attributes: mockAttributes,
                characterType: 'aero',
                isHost: true,
                socketId: '',
                nbWins: 0,
                hasActed: false,
                position: { x: 1, y: 1 },
            } as unknown as Player,
        ];

        mockGameService.gameState = {
            player: mockPlayers[0],
            activePlayer: mockPlayers[0],
            nextPlayer: undefined,
            players: mockPlayers,
            time: 0,
            yourTurn: true,
            actionMode: false,
            availableTiles: [
                [0, 1],
                [0, 2],
            ],
            map: {
                _tiles: [
                    [
                        { _tileType: TileEnum.Grass, traversable: true, imageSrc: 'string', terrain: true },
                        { _tileType: TileEnum.Water, traversable: false, imageSrc: 'string', terrain: true },
                    ],
                    [
                        { _tileType: TileEnum.Grass, traversable: true, imageSrc: 'string', terrain: true },
                        { _tileType: TileEnum.Grass, traversable: true, imageSrc: 'string', terrain: true },
                    ],
                ],
            } as Map,
            debugMode: signal(false),
        };

        await TestBed.configureTestingModule({
            imports: [GameComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: CombatService, useValue: mockCombatService },
                { provide: PlayerMovementService, useValue: mockPlayerMovementService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameComponent);
        component = fixture.componentInstance;
        component.hoverMovementPath = [];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should update grid styles', () => {
        const gridContainer = fixture.nativeElement.querySelector('.grid-container');
        component.updateGridStyles(CONSTANTS.SMALL_MAP_SIZE);
        expect(gridContainer.style.gridTemplateColumns).toBe('repeat(10, 1fr)');
        expect(gridContainer.style.gridTemplateRows).toBe('repeat(10, 1fr)');
    });

    it('should handle right click', () => {
        const event = new MouseEvent('contextmenu');
        mockGameService.isMyTurn.and.returnValue(true);
        component.onRightClick(event, 0, 0);
        expect(component.isRightClicked).toBeTrue();
        expect(component.popupText).toBeTruthy();
    });

    it('should handle left click for movement', () => {
        const tile = { _tileType: TileEnum.Grass, traversable: true, imageSrc: 'string', terrain: true };
        const pos = { x: 1, y: 1 };
        component.hoverMovementPath = [[1, 1]];
        mockGameService.gameState.yourTurn = true;
        mockGameService.gameState.actionMode = false;
        component.onLeftClick(tile, pos);
        expect(mockPlayerMovementService.movePlayer).toHaveBeenCalledWith([[1, 1]]);
    });

    // it('should handle left click for combat', () => {
    //     const mockPlayer = {
    //         userName: 'Enemy',
    //         attributes: {} as Attributes,
    //         characterType: 'aero',
    //         isHost: false,
    //         socketId: '',
    //         nbWins: 0,
    //         hasActed: false,
    //     } as unknown as Player;
    //     const tile = { _tileType: TileEnum.Grass, player: mockPlayer, traversable: true, imageSrc: 'string', terrain: true };
    //     const pos = { x: 1, y: 1 };
    //     mockGameService.gameState.actionMode = true;
    //     mockGameService.gameState.player.hasActed = false;
    //     component.onLeftClick(tile, pos);
    //     expect(mockCombatService.startCombat).toHaveBeenCalledWith('Enemy');
    // });

    // it('should handle left click for toggling door', () => {
    //     const tile = { _tileType: TileEnum.ClosedDoor, traversable: false, imageSrc: 'string', terrain: false };
    //     const pos = { x: 1, y: 1 };
    //     mockGameService.gameState.actionMode = true;
    //     mockGameService.gameState.player.hasActed = false;
    //     component.onLeftClick(tile, pos);
    //     expect(mockPlayerMovementService.toggleDoor).toHaveBeenCalledWith(pos);
    // });

    it('should not perform any action if player has already acted', () => {
        mockGameService.gameState.player.hasActed = true;
        const tile = { _tileType: TileEnum.Grass, traversable: false, imageSrc: 'string', terrain: false };
        const pos = { x: 1, y: 1 };
        component.onLeftClick(tile, pos);
        expect(mockCombatService.startCombat).not.toHaveBeenCalled();
        expect(mockPlayerMovementService.toggleDoor).not.toHaveBeenCalled();
    });

    it('should handle document click', () => {
        component.isRightClicked = true;
        component.onDocumentClick();
        expect(component.isRightClicked).toBeFalse();
    });

    it('should reset combat service on destroy', () => {
        component.ngOnDestroy();
        expect(mockCombatService.reset).toHaveBeenCalled();
    });

    it('should handle right click when not player turn', () => {
        const event = new MouseEvent('contextmenu');
        mockGameService.isMyTurn.and.returnValue(false);
        component.onRightClick(event, 0, 0);
        expect(component.isRightClicked).toBeFalse();
        expect(component.popupText).toBe('');
    });

    it('should handle right click for different tile types', () => {
        const event = new MouseEvent('contextmenu');
        mockGameService.isMyTurn.and.returnValue(true);

        // Test for ClosedDoor
        (mockGameService.gameState.map?._tiles[0] ?? [])[0] = {
            _tileType: TileEnum.ClosedDoor,
            traversable: false,
            imageSrc: 'string',
            terrain: false,
        };
        component.onRightClick(event, 0, 0);
        expect(component.popupText).toContain('Porte fermée');

        // Test for OpenDoor
        (mockGameService.gameState.map?._tiles[0] ?? [])[0] = {
            _tileType: TileEnum.OpenDoor,
            traversable: false,
            imageSrc: 'string',
            terrain: false,
        };
        component.onRightClick(event, 0, 0);
        expect(component.popupText).toContain('Porte ouverte');

        // Test for Water
        (mockGameService.gameState.map?._tiles[0] ?? [])[0] = { _tileType: TileEnum.Water, traversable: false, imageSrc: 'string', terrain: false };
        component.onRightClick(event, 0, 0);
        expect(component.popupText).toContain('Eau');

        // Test for Ice
        (mockGameService.gameState.map?._tiles[0] ?? [])[0] = { _tileType: TileEnum.Ice, traversable: false, imageSrc: 'string', terrain: false };
        component.onRightClick(event, 0, 0);
        expect(component.popupText).toContain('Glace');

        // Test for Rock
        (mockGameService.gameState.map?._tiles[0] ?? [])[0] = { _tileType: TileEnum.Rock, traversable: false, imageSrc: 'string', terrain: false };
        component.onRightClick(event, 0, 0);
        expect(component.popupText).toContain('Roche');
    });

    it('should handle left click when no active player', () => {
        mockGameService.gameState.activePlayer = undefined;
        const tile = { _tileType: TileEnum.Grass, traversable: false, imageSrc: 'string', terrain: false };
        const pos = { x: 0, y: 0 };
        component.onLeftClick(tile, pos);
        expect(mockPlayerMovementService.movePlayer).not.toHaveBeenCalled();
    });

    it('should handle left click when clicking on active player position', () => {
        const pos = { x: 1, y: 1 };
        mockGameService.gameState.activePlayer = {
            userName: 'Lyna',
            attributes: {} as Attributes,
            characterType: 'aero',
            isHost: true,
            socketId: '',
            nbWins: 0,
            hasActed: false,
            position: pos,
        } as unknown as Player;
        const tile = {
            _tileType: TileEnum.Grass,
            traversable: true,
            imageSrc: 'string',
            terrain: true,
            player: mockGameService.gameState.activePlayer,
        };

        component.onLeftClick(tile, pos);
        expect(mockPlayerMovementService.movePlayer).not.toHaveBeenCalled();
    });

    it('should handle left click when no map', () => {
        mockGameService.gameState.map = undefined;
        const tile = { _tileType: TileEnum.Grass, traversable: false, imageSrc: 'string', terrain: false };

        const pos = { x: 0, y: 0 };
        component.onLeftClick(tile, pos);
        expect(mockPlayerMovementService.movePlayer).not.toHaveBeenCalled();
    });

    it('should return false for isTileAvailable when no availableTiles', () => {
        mockGameService.gameState.availableTiles = undefined;
        expect(component.isTileAvailable(0, 0)).toBeFalse();
    });

    it('should handle fastestPath when tile is not available', () => {
        spyOn(component, 'isTileAvailable').and.returnValue(false);
        component.fastestPath(0, 0);
        expect(component.hoverMovementPath).toEqual([]);
    });

    it('should handle fastestPath when findPath returns null', () => {
        spyOn(component, 'isTileAvailable').and.returnValue(true);
        mockPlayerMovementService.findPath.and.returnValue(null);
        component.fastestPath(0, 0);
        expect(component.hoverMovementPath).toEqual([]);
    });

    it('should return false for isInPath when no path', () => {
        component.hoverMovementPath = [];
        expect(component.isInPath(0, 0)).toBeFalse();
    });

    it('should handle right click when map is undefined', () => {
        const event = new MouseEvent('contextmenu');
        mockGameService.isMyTurn.and.returnValue(true);
        mockGameService.gameState.map = undefined;
        component.onRightClick(event, 0, 0);
        expect(component.isRightClicked).toBeFalse();
        expect(component.popupText).toBe('');
    });

    it('should set path to empty array when findPath returns null', () => {
        mockGameService.gameState.yourTurn = true;
        spyOn(component, 'isTileAvailable').and.returnValue(true);
        mockPlayerMovementService.findPath.and.returnValue(null);
        component.fastestPath(0, 1);
        expect(component.hoverMovementPath).toEqual([]);
    });

    it('should return false for isInPath when path is undefined', () => {
        component.hoverMovementPath = [];
        expect(component.isInPath(0, 1)).toBeFalse();
    });

    it('should clear path', () => {
        component.hoverMovementPath = [[0, 1]];
        component.clearPath();
        expect(component.hoverMovementPath).toEqual([]);
    });

    it('should return false for isTileAdjacent when not in action mode', () => {
        mockGameService.gameState.actionMode = false;
        expect(component.isTileAdjacent(0, 1)).toBeFalse();
    });

    it('should return false for isTileAdjacent when player has acted', () => {
        mockGameService.gameState.actionMode = true;
        mockGameService.gameState.player.hasActed = true;
        expect(component.isTileAdjacent(0, 1)).toBeFalse();
    });

    it('should return false for isTileAdjacent when activePlayer is undefined', () => {
        mockGameService.gameState.actionMode = true;
        mockGameService.gameState.player.hasActed = false;
        mockGameService.gameState.activePlayer = undefined;
        expect(component.isTileAdjacent(0, 1)).toBeFalse();
    });

    it('should return false for isTileAdjacent when activePlayer position is undefined', () => {
        mockGameService.gameState.actionMode = true;
        mockGameService.gameState.player.hasActed = false;
        mockGameService.gameState.activePlayer = undefined;
        expect(component.isTileAdjacent(0, 1)).toBeFalse();
    });

    it('should return true for isTileAdjacent when tile is adjacent', () => {
        mockGameService.gameState.actionMode = true;
        mockGameService.gameState.player.hasActed = false;
        mockGameService.gameState.activePlayer = {
            userName: 'Lyna',
            attributes: {} as Attributes,
            characterType: 'aero',
            isHost: true,
            socketId: '',
            nbWins: 0,
            hasActed: false,
            position: { x: 0, y: 0 },
        } as unknown as Player;
        expect(component.isTileAdjacent(1, 0)).toBeTrue();
        expect(component.isTileAdjacent(0, 1)).toBeTrue();
    });

    it('should return false for isTileAdjacent when tile is not adjacent', () => {
        mockGameService.gameState.actionMode = true;
        mockGameService.gameState.player.hasActed = false;
        mockGameService.gameState.activePlayer = {
            userName: 'Lyna',
            attributes: {} as Attributes,
            characterType: 'aero',
            isHost: true,
            socketId: '',
            nbWins: 0,
            hasActed: false,
            position: { x: 0, y: 0 },
        } as unknown as Player;
        expect(component.isTileAdjacent(2, 2)).toBeFalse();
    });

    it('should set path correctly when findPath returns a valid path', () => {
        mockGameService.gameState.yourTurn = true;
        spyOn(component, 'isTileAvailable').and.returnValue(true);
        const mockPath = [
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
        ];
        mockPlayerMovementService.findPath.and.returnValue(mockPath);
        component.fastestPath(2, 1);
        expect(component.hoverMovementPath).toEqual([
            [0, 1],
            [1, 1],
            [2, 1],
        ]);
    });

    it('should return false for isInPath when path is undefined', () => {
        // Set the path to undefined
        component.hoverMovementPath = undefined;

        // Call isInPath with any coordinates
        const result = component.isInPath(0, 0);

        // Expect the result to be false
        expect(result).toBeFalse();
    });
});
