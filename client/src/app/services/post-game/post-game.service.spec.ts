import { TestBed } from '@angular/core/testing';
import { SortOrder, TOTAL_PERCENTAGE } from '@app/constants';
import { mockRoom } from '@app/mocks/mock-room';
import { ObjectType, TileType } from '@common/constants';
import { GlobalPostGameStat, GlobalPostGameStats } from '@common/interfaces/global-post-game-stats';
import { Player } from '@common/interfaces/player';
import { PostGameStat } from '@common/interfaces/post-game-stat';
import { PostGameService } from './post-game.service';
describe('PostGameService', () => {
    let service: PostGameService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PostGameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('resetOtherAttributes', () => {
        it('should reset all attributes except the selected one', () => {
            service.sortOrder = {
                combats: SortOrder.Ascending,
                victories: SortOrder.Descending,
                tilesVisited: SortOrder.Ascending,
            };

            service.resetOtherAttributes('victories');

            expect(service.sortOrder).toEqual({
                combats: SortOrder.Unsorted,
                victories: SortOrder.Descending,
                tilesVisited: SortOrder.Unsorted,
            });
        });
    });

    describe('toggleSortOrder', () => {
        it('should toggle the sort order of a given attribute', () => {
            service.sortOrder.tilesVisited = SortOrder.Ascending;
            service.toggleSortOrder('tilesVisited');
            expect(service.sortOrder.tilesVisited).toBe(SortOrder.Descending);

            service.toggleSortOrder('tilesVisited');
            expect(service.sortOrder.tilesVisited).toBe(SortOrder.Ascending);
        });
    });

    describe('performSorting', () => {
        it('should sort players based on a given attribute', () => {
            service.players = [
                { postGameStats: { tilesVisited: 0 } } as Player,
                { postGameStats: { tilesVisited: 1 } } as Player,
                { postGameStats: { tilesVisited: 2 } } as Player,
            ];

            service.sortOrder.tilesVisited = SortOrder.Ascending;
            service.performSorting('tilesVisited');

            expect(service.players.map((p) => p.postGameStats.tilesVisited)).toEqual([0, 1, 2]);
        });

        it('should not change the order of players with the same value for the given attribute', () => {
            service.players = [
                { postGameStats: { tilesVisited: 1 } } as Player,
                { postGameStats: { tilesVisited: 1 } } as Player,
                { postGameStats: { tilesVisited: 2 } } as Player,
            ];
            service.sortOrder = {
                tilesVisited: SortOrder.Ascending,
            };

            service.performSorting('tilesVisited');

            expect(service.players[0].postGameStats.tilesVisited).toBe(1);
            expect(service.players[1].postGameStats.tilesVisited).toBe(1);
            expect(service.players[2].postGameStats.tilesVisited).toBe(2);
            expect(service.players[0].postGameStats.tilesVisited).toBeLessThan(service.players[2].postGameStats.tilesVisited);
        });

        it('should sort players in ascending order when frontValue > backValue', () => {
            service.players = [
                { postGameStats: { tilesVisited: 2 } } as Player,
                { postGameStats: { tilesVisited: 0 } } as Player,
                { postGameStats: { tilesVisited: 1 } } as Player,
            ];
            service.sortOrder = {
                tilesVisited: SortOrder.Ascending,
            };
            service.performSorting('tilesVisited');

            expect(service.players[0].postGameStats.tilesVisited).toBe(0);
            expect(service.players[1].postGameStats.tilesVisited).toBe(1);
            expect(service.players[2].postGameStats.tilesVisited).toBe(2);
        });

        it('should sort players in descending order when frontValue < backValue', () => {
            service.players = [
                { postGameStats: { tilesVisited: 0 } } as Player,
                { postGameStats: { tilesVisited: 2 } } as Player,
                { postGameStats: { tilesVisited: 1 } } as Player,
            ];
            service.sortOrder = {
                tilesVisited: SortOrder.Descending,
            };
            service.performSorting('tilesVisited');

            expect(service.players[0].postGameStats.tilesVisited).toBe(2);
            expect(service.players[1].postGameStats.tilesVisited).toBe(1);
            expect(service.players[2].postGameStats.tilesVisited).toBe(0);
        });

        it('should maintain the original order when frontValue === backValue', () => {
            service.players = [
                { postGameStats: { tilesVisited: 1 } } as Player,
                { postGameStats: { tilesVisited: 1 } } as Player,
                { postGameStats: { tilesVisited: 1 } } as Player,
            ];
            service.sortOrder = {
                tilesVisited: SortOrder.Ascending,
            };

            service.performSorting('tilesVisited');
            expect(service.players[0].postGameStats.tilesVisited).toBe(1);
            expect(service.players[1].postGameStats.tilesVisited).toBe(1);
            expect(service.players[2].postGameStats.tilesVisited).toBe(1);
        });
    });

    describe('sortPlayers', () => {
        it('should sort players and reset other attributes', () => {
            spyOn(service, 'resetOtherAttributes');
            spyOn(service, 'toggleSortOrder');
            spyOn(service, 'performSorting');

            service.sortPlayers('tilesVisited');

            expect(service.selectedAttribute).toBe('tilesVisited');
            expect(service.resetOtherAttributes).toHaveBeenCalledWith('tilesVisited');
            expect(service.toggleSortOrder).toHaveBeenCalledWith('tilesVisited');
            expect(service.performSorting).toHaveBeenCalledWith('tilesVisited');
        });
    });

    describe('updateExplanations', () => {
        it('should update explanations for the selected attribute', () => {
            service.postGameStatTypes = [
                { key: 'tilesVisited', explanations: 'Number of tiles visited' } as PostGameStat,
                { key: 'damageDealt', explanations: 'Damage dealt to opponents' } as PostGameStat,
            ];

            service.updateExplanations('tilesVisited');
            expect(service.explanations).toBe('Number of tiles visited');

            service.updateExplanations('damageDealt');
            expect(service.explanations).toBe('Damage dealt to opponents');

            service.updateExplanations('');
            expect(service.explanations).toBe('');
        });
    });

    describe('getMaxStat', () => {
        it('should return the maximum value of a given stat', () => {
            service.players = [
                { postGameStats: { tilesVisited: 2 } } as Player,
                { postGameStats: { tilesVisited: 1 } } as Player,
                { postGameStats: { tilesVisited: 0 } } as Player,
            ];

            const maxStat = service.getMaxStat('tilesVisited');
            expect(maxStat).toBe(2);
        });
    });

    describe('countTiles', () => {
        it('should count tiles based on a condition', () => {
            service.tilesGrid = [
                [0, 1, 2],
                [1, 1, 0],
                [2, 0, 1],
            ];

            const count = service.countTiles((tile) => tile === 2);
            expect(count).toBe(2);
        });
    });

    describe('findTotalTerrainTiles', () => {
        it('should find the total terrain tiles', () => {
            spyOn(service, 'countTiles').and.returnValue(1);
            const total = service.findTotalTerrainTiles();
            expect(total).toBe(1);
        });
    });

    describe('findTotalDoors', () => {
        it('should find the total doors', () => {
            spyOn(service, 'countTiles').and.returnValue(1);
            const total = service.findTotalDoors();
            expect(total).toBe(1);
        });
    });

    describe('calculateInteractionPercentage', () => {
        it('should calculate the interaction percentage', () => {
            const percentage = service.calculateInteractionPercentage([{ x: 1, y: 1 }], TOTAL_PERCENTAGE);
            expect(percentage).toBe(1);

            const noInteraction = service.calculateInteractionPercentage([], 0);
            expect(noInteraction).toBe(-1);
        });
    });

    describe('transferRoomStats', () => {
        it('should transfer room stats to service properties', () => {
            service.transferRoomStats(mockRoom);

            expect(service.tilesGrid).toBe(mockRoom.gameMap.tiles);
            expect(service.players).toBe(mockRoom.listPlayers);
            expect(service.globalStats).toBe(mockRoom.globalPostGameStats);
        });
    });

    describe('computeStats', () => {
        it('should compute all stats except calculateFlagBearers', () => {
            spyOn(service, 'calculatePlayerTilesVisited');
            spyOn(service, 'computeDoorsInteractedPercentage');
            spyOn(service, 'computeGlobalTilesVisitedPercentage');
            spyOn(service, 'calculateUniqueItems');

            service.isFlagMode = false;
            service.computeStats();

            expect(service.calculatePlayerTilesVisited).toHaveBeenCalled();
            expect(service.computeDoorsInteractedPercentage).toHaveBeenCalled();
            expect(service.computeGlobalTilesVisitedPercentage).toHaveBeenCalled();
            expect(service.calculateUniqueItems).toHaveBeenCalled();
        });
        it('should compute all stats', () => {
            spyOn(service, 'calculatePlayerTilesVisited');
            spyOn(service, 'computeDoorsInteractedPercentage');
            spyOn(service, 'computeGlobalTilesVisitedPercentage');
            spyOn(service, 'calculateUniqueItems');
            spyOn(service, 'calculateFlagBearers');

            service.isFlagMode = true;
            service.computeStats();

            expect(service.calculatePlayerTilesVisited).toHaveBeenCalled();
            expect(service.computeDoorsInteractedPercentage).toHaveBeenCalled();
            expect(service.computeGlobalTilesVisitedPercentage).toHaveBeenCalled();
            expect(service.calculateUniqueItems).toHaveBeenCalled();
            expect(service.calculateFlagBearers).toHaveBeenCalled();
        });
    });

    describe('isAttributeVictories', () => {
        it('should check if the selected attribute is victories', () => {
            expect(service.isAttributeVictories('victories')).toBe(true);
            expect(service.isAttributeVictories('tilesVisited')).toBe(false);
        });
    });

    describe('computeGlobalTilesVisitedPercentage', () => {
        it('should compute the global tiles visited percentage', () => {
            spyOn(service, 'findTotalTerrainTiles').and.returnValue(TOTAL_PERCENTAGE);
            spyOn(service, 'calculateInteractionPercentage').and.returnValue(1);
            service.globalStats.globalTilesVisited = [{ x: 1, y: 1 }];
            service.computeGlobalTilesVisitedPercentage();
            expect(service.findTotalTerrainTiles).toHaveBeenCalled();
            expect(service.calculateInteractionPercentage).toHaveBeenCalledWith(service.globalStats.globalTilesVisited, TOTAL_PERCENTAGE);
            expect(service.globalTilesVisitedPercentage).toBe(1);
        });
    });

    describe('computeDoorsInteractedPercentage', () => {
        it('should compute the doors interacted percentage with a valid percentage', () => {
            spyOn(service, 'findTotalDoors').and.returnValue(TOTAL_PERCENTAGE / 2);
            spyOn(service, 'calculateInteractionPercentage').and.returnValue(2);
            service.globalStats.doorsInteracted = [{ x: 2, y: 2 }];
            service.computeDoorsInteractedPercentage();
            expect(service.findTotalDoors).toHaveBeenCalled();
            expect(service.calculateInteractionPercentage).toHaveBeenCalledWith(service.globalStats.doorsInteracted, TOTAL_PERCENTAGE / 2);
            expect(service.doorsInteractedPercentage).toBe('2%');
        });

        it('should compute the doors interacted percentage as NA when no total doors', () => {
            spyOn(service, 'findTotalDoors').and.returnValue(0);
            spyOn(service, 'calculateInteractionPercentage').and.returnValue(-1);
            service.globalStats.doorsInteracted = [];
            service.computeDoorsInteractedPercentage();
            expect(service.findTotalDoors).toHaveBeenCalled();
            expect(service.calculateInteractionPercentage).toHaveBeenCalledWith(service.globalStats.doorsInteracted, 0);
            expect(service.doorsInteractedPercentage).toBe('NA');
        });
    });

    describe('calculateDoorsInteracted', () => {
        it('should calculate the correct interaction percentage for doors', () => {
            service.globalStats = {
                doorsInteracted: [
                    { x: 1, y: 2 },
                    { x: 3, y: 4 },
                ],
            } as GlobalPostGameStats;
            spyOn(service, 'findTotalDoors').and.returnValue(TOTAL_PERCENTAGE);
            const result = service.calculateDoorsInteracted();
            expect(result).toBe(2);
        });
    });

    describe('calculatePlayerTilesVisited', () => {
        it('should calculate and set the correct tiles visited for each player', () => {
            service.players = [
                { positionHistory: [{ x: 1, y: 2 }, [{ x: 3, y: 4 }]], postGameStats: {} } as Player,
                { positionHistory: [{ x: 1, y: 2 }], postGameStats: {} } as Player,
            ];
            spyOn(service, 'findTotalTerrainTiles').and.returnValue(TOTAL_PERCENTAGE);
            service.calculatePlayerTilesVisited();
            expect(service.players[0].postGameStats.tilesVisited).toBe(2);
            expect(service.players[1].postGameStats.tilesVisited).toBe(1);
        });
    });

    describe('updateExplanationsGlobal', () => {
        it('should update the explanations property with the given GlobalPostGameStat', () => {
            const mockStat: GlobalPostGameStat = {
                explanations: 'Explanation 1',
            } as GlobalPostGameStat;
            service.updateExplanationsGlobal(mockStat);
            expect(service.explanations).toEqual(mockStat.explanations);
        });
    });

    describe('calculateUniqueItems', () => {
        it('should correctly count unique items for each player', () => {
            service['players'] = [
                { collectedItems: [ObjectType.Armor, ObjectType.Xiphos], postGameStats: { itemsObtained: 0 } } as Player,
                { collectedItems: [ObjectType.Armor], postGameStats: { itemsObtained: 0 } } as Player,
                { collectedItems: undefined, postGameStats: { itemsObtained: 0 } } as Player,
            ];

            service.calculateUniqueItems();

            expect(service['players'][0].postGameStats.itemsObtained).toBe(2);
            expect(service['players'][1].postGameStats.itemsObtained).toBe(1);
            expect(service['players'][2].postGameStats.itemsObtained).toBe(0);
        });
    });

    describe('calculateFlagBearers', () => {
        it('should correctly count players with ObjectType.Flag items', () => {
            service['players'] = [
                { collectedItems: [ObjectType.Lightning, ObjectType.Flag], postGameStats: {} } as Player,
                { collectedItems: [ObjectType.Trident, ObjectType.Flag], postGameStats: {} } as Player,
                { collectedItems: [ObjectType.Trident], postGameStats: {} } as Player,
                { collectedItems: undefined, postGameStats: {} } as Player,
            ];

            service['globalStats'] = { nbFlagBearers: 0 } as GlobalPostGameStats;

            service.calculateFlagBearers();
            expect(service['globalStats'].nbFlagBearers).toBe(2);
        });
    });

    describe('findTotalTerrainTiles', () => {
        it('should correctly count terrain tiles', () => {
            service['tilesGrid'] = [
                [0, TileType.Wall, TileType.Wall, 2],
                [TileType.Wall, TileType.Wall, TileType.Wall, TileType.Wall],
            ];

            const totalTerrainTiles = service.findTotalTerrainTiles();
            expect(totalTerrainTiles).toBe(2);
        });
    });

    describe('findTotalDoors', () => {
        it('should correctly count door tiles', () => {
            service['tilesGrid'] = [
                [TileType.Wall - 1, TileType.Wall, 0, TileType.Wall + 2],
                [TileType.Wall - 1, TileType.Wall, TileType.Wall + 1, 0],
            ];

            const totalDoors = service.findTotalDoors();
            expect(totalDoors).toBe(2);
        });
    });
});
