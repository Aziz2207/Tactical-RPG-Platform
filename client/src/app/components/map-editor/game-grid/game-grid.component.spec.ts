import { SimpleChange, SimpleChanges } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameObjectsContainerComponent } from '@app/components/map-editor/game-objects-container/game-objects-container.component';
import { NO_OBJECT, SIZE_SMALL_MAP } from '@app/constants';
import { mockGameNavigation, mockPositions } from '@app/mocks/mock-map';
import { mockObjects } from '@app/mocks/mock-object';
import { mockPlayer } from '@app/mocks/mock-player';
import { mockPlayers } from '@app/mocks/mock-players';
import { mockRoom } from '@app/mocks/mock-room';
import { mockValidationInfo } from '@app/mocks/mock-validation';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameObjectService } from '@app/services/game-object/game-object.service';
import { GameTileInfoService } from '@app/services/game-tile-info/game-tile-info.service';
import { MapValidatorService } from '@app/services/map-validator/map-validator.service';
import { NavigationService } from '@app/services/navigation/navigation.service';
import { GameService } from '@app/services/sockets/game/game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { TileService } from '@app/services/tile/tile.service';
import { ToolButtonService } from '@app/services/tool-button/tool-button.service';
import { ToolService } from '@app/services/tool/tool.service';
import { avatars, ObjectType } from '@common/avatars-info';
import { TileType } from '@common/constants';
import { Player, Position, Status } from '@common/interfaces/player';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { Socket } from 'socket.io-client';
import { GameGridComponent } from './game-grid.component';

/* eslint-disable max-lines */
/* eslint-disable max-len */
describe('GameGridComponent', () => {
    let component: GameGridComponent;
    let fixture: ComponentFixture<GameGridComponent>;
    let toolServiceSpy: jasmine.SpyObj<ToolService>;
    let mapValidatorServiceSpy: jasmine.SpyObj<MapValidatorService>;
    let gameObjectManagerServiceSpy: jasmine.SpyObj<GameObjectService>;
    let toolButtonServiceSpy: jasmine.SpyObj<ToolButtonService>;
    let gameCreationServiceSpy: jasmine.SpyObj<GameCreationService>;
    let tileServiceSpy: jasmine.SpyObj<TileService>;
    let gameObjectsContainerSpy: jasmine.SpyObj<GameObjectsContainerComponent>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
    let mockSocket: Socket;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let gameTileInfoServiceSpy: jasmine.SpyObj<GameTileInfoService>;

    beforeEach(async () => {
        gameTileInfoServiceSpy = jasmine.createSpyObj('GameTileInfoService', ['transferRoomData', 'tileId', 'itemId', 'selectedRow', 'selectedCol']);
        mockSocket = { data: { roomCode: '1234' }, id: 'admin' } as unknown as Socket;
        tileServiceSpy = jasmine.createSpyObj('TileService', ['setTile', 'resetGrid', 'removeTile', 'getTileImage']);
        gameObjectsContainerSpy = jasmine.createSpyObj('GameObjectsContainerComponent', ['objects']);
        toolServiceSpy = jasmine.createSpyObj('ToolService', ['getSelectedTile', 'setSelectedTile', 'deactivateTileApplicator']);
        toolButtonServiceSpy = jasmine.createSpyObj('ToolButtonService', [], { selectedButton: null });
        mapValidatorServiceSpy = jasmine.createSpyObj('MapValidatorService', ['validateMap']);
        gameCreationServiceSpy = jasmine.createSpyObj('GameCreationService', [
            'rightClick',
            'resetGrid',
            'loadExistingTiles',
            'loadExistingObjects',
            'rightClick',
            'showDetails',
            'updateDimensions',
        ]);
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['isSocketAlive', 'connect', 'on', 'send', 'once']);
        gameObjectManagerServiceSpy = jasmine.createSpyObj('GameObjectService', [
            'initObjectsArray',
            'resetObjectsCount',
            'getObjectById',
            'getGameObjectOnTile',
            'updateObjectGridPosition',
            'removeObjectFromGrid',
            'removeObjectByClick',
            'resetDrag,',
            'loadMapObjectCount',
            'ngOnDestroy',
            'resetObjectsCount',
            'checkGameObject',
            'onDrop',
            'handleGameObjectOnTile',
            'isValidTileForObject',
            'onDragStart',
            'objects',
            'handleTileClick',
            'loadExistingGame',
            'startMouseDrag',
            'startDropItem',
            'removeOnRightClick',
            'startMouseDrag',
            'objectsArray',
            'startDropItem',
        ]);
        navigationServiceSpy = jasmine.createSpyObj('NavigationService', [
            'initialize',
            'getPortraitId',
            'isPositionWithinBounds',
            'isReachableTile',
            'removePlayer',
            'gameMap',
            'isNeighbor',
            'updateTile',
            'isOnWall',
            'respawnPlayer',
            'handleInventoryEvent',
            'updateObjects',
            'displayPortraitsOnSpawnPoints',
            'findPath',
            'isInteractionPossible',
            'navigateToTile',
        ]);
        gameServiceSpy = jasmine.createSpyObj('GameService', [
            'isTarget',
            'isActionSelected',
            'hasActionPoints',
            'canOpenDoor',
            'canStartCombat',
            'handleFightAction',
            'handleTileClick',
        ]);
        socketCommunicationServiceSpy.socket = mockSocket;

        const gameObjectServiceMock = {
            initObjectsArray: jasmine.createSpy('initObjectsArray').and.callFake(() => {
                return Array.from({ length: SIZE_SMALL_MAP }, () => Array.from({ length: SIZE_SMALL_MAP }, () => NO_OBJECT));
            }),
        };

        await TestBed.configureTestingModule({
            declarations: [],
            providers: [
                { provide: ToolService, useValue: toolServiceSpy },
                { provide: ToolButtonService, useValue: toolButtonServiceSpy },
                { provide: MapValidatorService, useValue: mapValidatorServiceSpy },
                { provide: GameObjectService, useValue: gameObjectManagerServiceSpy },
                { provide: GameCreationService, useValue: gameCreationServiceSpy },
                { provide: TileService, useValue: tileServiceSpy },
                { provide: GameObjectsContainerComponent, useValue: gameObjectsContainerSpy },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: NavigationService, useValue: navigationServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: GameTileInfoService, useValue: gameTileInfoServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameGridComponent);
        component = fixture.componentInstance;
        gameObjectManagerServiceSpy.objects = mockObjects;
        gameObjectsContainerSpy.gameObjects = mockObjects;
        component['gridSize'] = SIZE_SMALL_MAP;
        component['objectsArray'] = gameObjectServiceMock.initObjectsArray();
        gameObjectManagerServiceSpy['gridSize'] = SIZE_SMALL_MAP;
        spyOn(component, 'sendInfoToMapCreationPage');
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize properties correctly', () => {
        expect(component['isMouseDown']).toBeFalse();
    });

    it('should call getSelectedTile', () => {
        component.getSelectedTile();
        expect(toolServiceSpy.getSelectedTile).toHaveBeenCalled();
    });

    describe('ngOnInit', () => {
        it('should call connect on ngOnInit', () => {
            component.ngOnInit();
            expect(socketCommunicationServiceSpy.connect).toHaveBeenCalled();
        });
    });

    it('should call transferRoomData', () => {
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.ObtainRoomInfo) {
                callback(mockRoom as T);
            }
        });
        component.ngOnInit();
        expect(gameTileInfoServiceSpy.transferRoomData).toHaveBeenCalledWith(mockRoom);
    });

    it('should call handleTeleport on TeleportPlayer event', () => {
        const data = { position: { x: 0, y: 0 }, player: { ...mockPlayers[0] } };
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.TeleportPlayer) {
                callback(data as T);
            }
        });
        spyOn(component, 'handleTeleport');
        component.initMovementListeners();
        expect(component.handleTeleport).toHaveBeenCalled();
    });

    it('should call the correct function on handleTileClick', () => {
        component['activePlayer'] = { ...mockPlayers[0] };
        gameServiceSpy.handleTileClick.and.returnValue(false);
        spyOn(component, 'sendNavigation');
        component.handleTileClick(0, 0);
        expect(component.sendNavigation).not.toHaveBeenCalled();

        gameServiceSpy.handleTileClick.and.returnValue(true);
        component.handleTileClick(0, 0);
        expect(component.sendNavigation).toHaveBeenCalled();
    });

    describe('socket listener', () => {
        it('should listen to mapInformation event onInit', () => {
            spyOn(component, 'displayPortraitOnSpawnPoints');
            socketCommunicationServiceSpy.on.and.callFake(<Room>(event: string, callback: (data: Room) => void) => {
                if (event === ServerToClientEvent.GameGridMapInfo) {
                    callback(mockRoom as Room);
                }
            });

            component.ngOnInit();
            expect(component.displayPortraitOnSpawnPoints).toHaveBeenCalled();
            expect(navigationServiceSpy.initialize).toHaveBeenCalled();
        });

        it('should call sendBothPathToServer on BotNavigation event', () => {
            const mockPath = [{ x: 0, y: 0 }];
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.BotNavigation) {
                    callback(mockPath as T);
                }
            });
            spyOn(component, 'sendBotPathToServer');
            component.initMovementListeners();
            expect(component.fastestPath).toEqual(mockPath);
            expect(component.sendBotPathToServer).toHaveBeenCalled();
        });

        it('should call send event CombatAction on BotAttack event', () => {
            const data = { clickedPosition: { x: 0, y: 0 }, player: { ...mockPlayers[0] } };
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.BotAttack) {
                    callback(data as T);
                }
            });
            component['activePlayer'] = { ...mockPlayers[0] };
            component.initGameListeners();
            expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.CombatAction, data);
        });

        it('should decrease action points on combatEnd', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.CombatEnd) {
                    callback({} as T);
                }
            });
            component['activePlayer'] = { ...mockPlayers[0] };
            component['activePlayer'].attributes.actionPoints = 1;
            component.initGameListeners();
            expect(component['activePlayer'].attributes.actionPoints).toEqual(0);
        });

        it('should set fastestPath', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.PathFound) {
                    callback([{ x: 0, y: 0 }] as T);
                }
            });
            component.initMovementListeners();
            expect(component.fastestPath).toEqual([{ x: 0, y: 0 }]);
        });

        it('should call navigateToTile on handleTeleport', () => {
            navigationServiceSpy.players = [{ ...mockPlayers[0] }];
            spyOn(component, 'navigateToTile');
            component.handleTeleport({ x: 0, y: 0 }, { ...mockPlayers[0] }.id);
            expect(component.navigateToTile).toHaveBeenCalled();
        });

        it('getTileImage should call the corresponding function from tileService', () => {
            component.getTileImage(0);
            expect(tileServiceSpy.getTileImage).toHaveBeenCalledWith(0);
        });

        it('should modify the objectsArray with the result from displayPortraitsOnSpawnPoints from navigationService', () => {
            component.objectsArray = [[1, 1]];
            const player = { ...mockPlayers[0] };
            player.position = { x: 0, y: 0 };
            player.avatar = avatars[0];
            navigationServiceSpy.displayPortraitsOnSpawnPoints.and.returnValue([[ObjectType.Hestia, 1]]);
            component.displayPortraitOnSpawnPoints([player]);
            expect(component.objectsArray).toEqual([[ObjectType.Hestia, 1]]);
            expect(navigationServiceSpy.displayPortraitsOnSpawnPoints).toHaveBeenCalled();
        });

        it('should call navigate to tile if player is the one being respawned', () => {
            component['activePlayer'] = { ...mockPlayers[0] };
            component['activePlayer'].id = '1';
            spyOn(component, 'navigateToTile');
            component.handleRespawnPlayer({ x: 0, y: 0 }, component['activePlayer']);
            expect(component.navigateToTile).toHaveBeenCalled();
        });

        it('should call startMouseDrag', () => {
            component.onDragStart(0, 0);
            expect(gameObjectManagerServiceSpy.startMouseDrag).toHaveBeenCalled();
        });

        it('should call startDropItem and set objectsArray with onDrop', () => {
            const mockEvent = new DragEvent('drop');
            component.objectsArray = [[]];
            gameObjectManagerServiceSpy.objectsArray = [[1, 1]];
            component.onDrop(mockEvent, 0, 0);
            expect(component.objectsArray).toEqual(gameObjectManagerServiceSpy.objectsArray);
            expect(gameObjectManagerServiceSpy.startDropItem).toHaveBeenCalled();
            expect(component.sendInfoToMapCreationPage).toHaveBeenCalled();
        });

        it('removeOnRightClick should call removeOnRightClick and sendInfoToMapCreationPage', () => {
            const mockEvent = new MouseEvent('click', { button: 1 });
            component.removeOnRightClick(mockEvent, 0, 0);
            expect(gameObjectManagerServiceSpy.removeOnRightClick).toHaveBeenCalled();
            expect(component.sendInfoToMapCreationPage).toHaveBeenCalled();
        });

        it('should call rightClick from gameCreationService', () => {
            const mockEvent = jasmine.createSpyObj('MouseEvent', ['preventDefault']);
            gameCreationServiceSpy.rightClick.and.returnValue([true, false]);
            component.handleRightClick(mockEvent, 0, 0);
            expect(gameCreationServiceSpy.rightClick).toHaveBeenCalled();
            expect(component['isMoving']).toBeTrue();
            expect(component.tileInfoVisible).toBeFalse();
        });

        it('should call findPath if tile is not reachable', () => {
            component.fastestPath = [];
            navigationServiceSpy.findPath.and.returnValue([{ x: 1, y: 0 }]);
            navigationServiceSpy.isReachableTile.and.returnValue(false);
            component.findPath(0, 0);
            expect(component.fastestPath).toEqual([{ x: 1, y: 0 }]);
            expect(socketCommunicationServiceSpy.send).not.toHaveBeenCalled();

            navigationServiceSpy.isReachableTile.and.returnValue(true);
            component.isActivePlayer = true;
            component.findPath(0, 0);
            expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.FindPath, { x: 0, y: 0 });
        });

        it('should call isActionDoorSelected', () => {
            component.isActionSelected();
            expect(gameServiceSpy.isActionSelected).toHaveBeenCalled();
        });

        it('should call isTarget from gameService', () => {
            component.isTarget(0, 0);
            expect(gameServiceSpy.isTarget).toHaveBeenCalled();
        });

        it('should call navigateToTile', () => {
            component.objectsArray = [];
            component['activePlayer'] = mockPlayers[0];
            navigationServiceSpy.navigateToTile.and.returnValue([[[1, 0]], mockPlayers[0]]);
            component.navigateToTile({ x: 0, y: 0 });
            expect(component.fastestPath).toEqual([]);
            expect(component.objectsArray).toEqual([[1, 0]]);
            expect(component['activePlayer']?.position).toEqual(mockPlayers[0].position);

            component['activePlayer'] = undefined;
            component.navigateToTile({ x: 0, y: 0 });
        });

        it('should set activePlayer if handleInventoryEvent is defined', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.UpdatedInventory) {
                    callback({ ...mockPlayers[0] } as T);
                }
            });
            navigationServiceSpy.handleInventoryEvent.and.returnValue({ ...mockPlayers[0] });
            component.initObjectsListeners();
            expect(component['activePlayer']).toEqual(mockPlayers[0]);
        });

        it('should not set activePlayer if result is undefined', () => {
            navigationServiceSpy.handleInventoryEvent.and.returnValue(undefined);
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.UpdatedInventory) {
                    callback({ ...(mockPlayers[0] as T) });
                }
            });
            component['activePlayer'] = { ...mockPlayers[0] };
            component.initObjectsListeners();
            expect(component['activePlayer']).toBeDefined();
        });

        it('should call updateObjects on UpdateObjects event', () => {
            const items = [[1, 0]];
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.UpdateObjects) {
                    callback(items as T);
                }
            });
            component.initObjectsListeners();
            expect(navigationServiceSpy.updateObjects).toHaveBeenCalledWith(items);
        });

        it('should call updateObjects and modify this.objectsArray on UpdateObjectsAfterCombat', () => {
            component.objectsArray = [[0, 0]];
            const data = { newGrid: [[1, 1]], position: { x: 0, y: 0 } };
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.UpdateObjectsAfterCombat) {
                    callback(data as T);
                }
            });
            component.initObjectsListeners();
            expect(navigationServiceSpy.updateObjects).toHaveBeenCalledWith(data.newGrid);
            expect(component.objectsArray[data.position.x][data.position.y]).toEqual(data.newGrid[data.position.x][data.position.y]);
        });

        it('should set reachableTiles on reachableTiles event', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'reachableTiles') {
                    callback(mockPositions as T);
                }
            });
            component.ngOnInit();
            expect(navigationServiceSpy.reachableTiles).toEqual(mockPositions);
        });

        it('should listen to doorClicked event onInit', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'doorClicked') {
                    callback(mockGameNavigation.tiles as T);
                }
            });

            component.ngOnInit();
            expect(gameServiceSpy.isActionDoorSelected).toBe(false);
            expect(component['tilesGrid']).toEqual(mockGameNavigation.tiles);
        });

        it('should call handleActivePlayer on ActivePlayer event', () => {
            spyOn(component, 'handleActivePlayer');
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === ServerToClientEvent.ActivePlayer) {
                    callback({ ...mockPlayers[0] } as T);
                }
            });
            component.initGameListeners();
            expect(component.handleActivePlayer).toHaveBeenCalledWith({ ...mockPlayers[0] });
        });

        it('handleActivePlayer should set the attributes', () => {
            component['activePlayer'] = { ...mockPlayers[0] };
            mockSocket.id = 'admin1234';
            component.handleActivePlayer({ ...mockPlayers[1] });
            expect(component.isActivePlayer).toBeFalse();
            expect(component['activePlayer']).toEqual({ ...mockPlayers[1] });
        });

        it('should listen to endMovement event onInit', () => {
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'endMovement') {
                    callback({} as T);
                }
            });

            component.ngOnInit();
            expect(component['isMoving']).toBe(false);
        });

        it('should listen to playerNavigation event onInit', () => {
            const mockPosition: Position = { x: 3, y: 4 };
            spyOn(component, 'navigateToTile');
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'playerNavigation') {
                    callback(mockPosition as T);
                }
            });
            component.ngOnInit();
            expect(component.navigateToTile).toHaveBeenCalledWith(mockPosition);
        });

        it('should listen to playerDisconnected event onInit', () => {
            const mockDisconnectedPlayer = { ...mockPlayer, status: Status.Disconnected };
            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'playerDisconnected') {
                    callback(mockDisconnectedPlayer as T);
                }
            });
            component.ngOnInit();
            expect(navigationServiceSpy.removePlayer).toHaveBeenCalled();
        });

        it('should listen to respawnPlayer event onInit and call respawnPlayer with the correct data', () => {
            const mockPosition = { x: 1, y: 2 };
            const mockPlayerToReplace = { id: 1, status: Status.Player } as unknown as Player;
            spyOn(component, 'respawnPlayer');

            socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'respawnPlayer') {
                    callback({ newPosition: mockPosition, playerToReplace: mockPlayerToReplace } as T);
                }
            });

            component.ngOnInit();
            expect(component.respawnPlayer).toHaveBeenCalled();
        });
    });

    it('isOnFastestPath should return true if a tile matches', () => {
        component.fastestPath = [{ x: 1, y: 1 }];
        const result = component.isOnFastestPath(1, 1);
        expect(result).toBeTrue();
    });

    it('isOnFastestPath should return false if tile is not on fastest path', () => {
        component.fastestPath = [{ x: 1, y: 1 }];
        const result = component.isOnFastestPath(2, 1);
        expect(result).toBeFalse();
    });

    it('sendNavigation should call navigateToTile in navigationService', () => {
        gameCreationServiceSpy.isModifiable = false;
        component.isActivePlayer = true;
        component.hasStarted = true;
        component['isMoving'] = false;
        component.sendNavigation();
        expect(component['isMoving']).toBeTrue();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalled();
    });

    it('should send PlayerNavigation with sendBotPathToServer', () => {
        component.fastestPath = [{ x: 0, y: 0 }];
        component.sendBotPathToServer();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ServerToClientEvent.PlayerNavigation, [{ x: 0, y: 0 }]);
        expect(component.fastestPath).toEqual([]);
    });

    describe('ngOnChanges', () => {
        it('should reset the grid when resetTrigger changes to true', () => {
            component['tilesGrid'] = mockRoom.gameMap.tiles;
            component['oldMapName'] = mockValidationInfo.oldMapName;
            component['tilesGrid'][0][0] = TileType.Water;
            const changes: SimpleChanges = {
                resetTrigger: new SimpleChange(false, true, false),
            };

            component.ngOnChanges(changes);
            expect(component['tilesGrid']).toBeUndefined();
        });

        it('should validate the map when saveTrigger changes to true', () => {
            component['oldMapName'] = mockValidationInfo.oldMapName;
            component.mapName = mockValidationInfo.title;
            component.mapDescription = mockValidationInfo.description;
            component['tilesGrid'] = mockValidationInfo.tiles;
            gameCreationServiceSpy.isNewGame = mockValidationInfo.isNewMap;
            const changes: SimpleChanges = {
                saveTrigger: new SimpleChange(false, true, false),
            };
            component.saveTrigger = true;
            component.ngOnChanges(changes);
            expect(mapValidatorServiceSpy.validateMap).toHaveBeenCalledWith(mockValidationInfo);
        });

        it('should reset objectsArray and tilesGrid when resetTrigger changes and isNewGame is true', () => {
            gameCreationServiceSpy.isNewGame = true;
            const changes: SimpleChanges = {
                resetTrigger: new SimpleChange(false, true, false),
            };
            component.ngOnChanges(changes);
            expect(gameObjectManagerServiceSpy.initObjectsArray).toHaveBeenCalled();
            expect(gameObjectManagerServiceSpy.resetObjectsCount).toHaveBeenCalled();
            expect(component.sendInfoToMapCreationPage).toHaveBeenCalled();
        });
    });

    describe('mouse events', () => {
        it('should set isMouseDown to false on mouse up', () => {
            component['isMouseDown'] = true;
            component.onMouseUp();
            expect(component['isMouseDown']).toBeFalse();
        });
    });

    describe('drag event', () => {
        it('should prevent default behaviour on drag over ', () => {
            const mockEvent = jasmine.createSpyObj('DragEvent', ['preventDefault']);
            component.onDragOver(mockEvent);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    it('should return the correct image path for an existing object', () => {
        const mockGameObject = { id: 1, name: 'mock', description: 'mock game object for test', count: 5, image: 'mock/image.png' };
        gameObjectManagerServiceSpy.getObjectById.and.returnValue(mockGameObject);
        const result = component.getObjectImage(mockGameObject.id);
        expect(result).toBe(mockGameObject.image);
    });

    it('should return an empty string for a non-existing object', () => {
        gameObjectManagerServiceSpy.getObjectById.and.returnValue(undefined);
        const result = component.getObjectImage(NO_OBJECT);
        expect(result).toBe('');
    });

    it('should call toolService to reset selectedTile on destroy', () => {
        component.ngOnDestroy();
        expect(toolServiceSpy.selectedTile).toBe('');
    });

    it('should return early when mouse is down and previousRow and previousCol match', () => {
        component['previousRow'] = 1;
        component['previousCol'] = 1;
        spyOn(component, 'onTileClick').and.callThrough();

        component.onTileClick(1, 1);
        expect(component.onTileClick).toHaveBeenCalledTimes(1);
    });

    it('should not call the other methods if the condition is met in onTileClick', () => {
        component['isMouseDown'] = true;
        component['previousRow'] = 1;
        component['previousCol'] = 1;
        component.onTileClick(1, 1);
        expect(tileServiceSpy.setTile).not.toHaveBeenCalled();
        expect(gameObjectManagerServiceSpy.handleGameObjectOnTile).not.toHaveBeenCalled();
        expect(component.sendInfoToMapCreationPage).not.toHaveBeenCalled();
    });

    describe('onMouseDown and onMouseMove', () => {
        beforeEach(() => {
            spyOn(component, 'onTileClick');
        });

        it('should call onTileClick is button is 0', () => {
            component['isMouseDown'] = false;
            const mockEvent = new MouseEvent('click', { button: 0 });
            component.onMouseDown(mockEvent, 0, 0);
            expect(component['isMouseDown']).toBeTrue();
            expect(component.onTileClick).toHaveBeenCalled();
        });

        it('should not call onTileClick if the event button is not 0', () => {
            component['isMouseDown'] = false;
            const mockEvent = new MouseEvent('click', { button: 1 });
            component.onMouseDown(mockEvent, 0, 0);
            expect(component['isMouseDown']).toBeFalse();
            expect(component.onTileClick).not.toHaveBeenCalled();
        });

        it('should call onTileClick if isMouseDown is true', () => {
            component['isMouseDown'] = true;
            component.onMouseMove(0, 0);
            expect(component.onTileClick).toHaveBeenCalledWith(0, 0);
        });

        it('should not call onTileClick if isMouseDown is false', () => {
            component['isMouseDown'] = false;
            component.onMouseMove(0, 0);
            expect(component.onTileClick).not.toHaveBeenCalled();
        });
    });

    it('should set the tile to Ground if conditions are met', () => {
        const event = new MouseEvent('click');
        component.removeTile(event, 0, 0);
        expect(tileServiceSpy.removeTile).toHaveBeenCalled();
    });

    it('should do nothing if the player is not found', () => {
        const mockPosition = { x: 1, y: 1 };
        const player = { id: 1, position: { x: 0, y: 0 } } as unknown as Player;
        navigationServiceSpy.players = [];
        spyOn(component, 'displayPortraitOnSpawnPoints');

        component.respawnPlayer(mockPosition, player);
        expect(navigationServiceSpy.updateTile).not.toHaveBeenCalled();
        expect(component.displayPortraitOnSpawnPoints).not.toHaveBeenCalled();
    });
});
