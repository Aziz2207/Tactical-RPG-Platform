import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { mockPlayer } from '@app/mocks/mock-player';
import { mockInventoryPlayer, mockInventoryPlayerWithXiphos, mockPlayers } from '@app/mocks/mock-players';
import { mockRoom } from '@app/mocks/mock-room';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Attributes, Player } from '@common/interfaces/player';
import { ServerToClientEvent } from '@common/socket.events';
import { PlayerInfoInventoryComponent } from './player-info-inventory.component';

describe('PlayerInfoInventoryComponent', () => {
    let component: PlayerInfoInventoryComponent;
    let fixture: ComponentFixture<PlayerInfoInventoryComponent>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;

    beforeEach(async () => {
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['on']);
        await TestBed.configureTestingModule({
            imports: [PlayerInfoInventoryComponent],
            providers: [{ provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerInfoInventoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.player = mockLobbyPlayers[0];
        component.healthBar = new ElementRef(document.createElement('progress'));
        component.playerId = mockPlayer.id.toString();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should update movementPointsArray when UpdateAllPlayers event is triggered', () => {
        const mockPlayerList = [{ id: component.player.id, attributes: { movementPointsLeft: 1 } } as Player];

        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === ServerToClientEvent.UpdateAllPlayers) {
                callback(mockPlayerList as T);
            }
        });
        component.player = mockInventoryPlayer;
        component.ngOnInit();
        expect(component.movementPointsArray).toEqual(Array(1));
    });

    describe('getActionArray', () => {
        it('should return empty array if actionPoints is negative', () => {
            component.activePlayer = { id: 'matchingId', attributes: { actionPoints: -1 } } as Player;
            component.player.attributes = { actionPoints: 0 } as Attributes;
            component.player.id = 'matchingId';
            const result = component.getActionArray();
            expect(result).toEqual([]);
        });
        it('should return the correct action array for the current player', () => {
            component.activePlayer = { id: 'someOtherId', attributes: { actionPoints: 2 } } as Player;
            component.player.attributes = { actionPoints: 2 } as Attributes;
            const result = component.getActionArray();
            expect(result).toEqual(Array(2));
        });
    });

    it('should get the good number of empty slots', () => {
        component.player = mockInventoryPlayer;
        expect(component.emptySlots).toEqual([]);

        component.player = mockPlayers[0];
        expect(component.emptySlots).toEqual([0, 0]);
    });

    it('should return the correct value for hasXiphos', () => {
        expect(component.hasXiphos(mockInventoryPlayer)).toBeUndefined();
        expect(component.hasXiphos(mockInventoryPlayerWithXiphos)).toBeDefined();
    });

    it('should set the info on updateInventory', () => {
        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'updateInventory') {
                callback(mockInventoryPlayer as T);
            }
        });
        component.player = mockInventoryPlayer;
        component.ngOnInit();
        expect(component.player.attributes).toEqual(mockInventoryPlayer.attributes);
        expect(component.player.inventory).toEqual(mockInventoryPlayer.inventory);
        expect(component.player.attributes.currentHp).toEqual(mockInventoryPlayer.attributes.totalHp);
    });

    it('should subscribe to mapInformation and update player data', () => {
        component.playerId = mockLobbyPlayers[0].id;
        const room = mockRoom;
        room.listPlayers = mockLobbyPlayers;

        socketCommunicationServiceSpy.on.and.callFake(<Room>(event: string, callback: (data: Room) => void) => {
            if (event === 'mapInformation') {
                callback(mockRoom as Room);
            }
        });

        component.ngOnInit();

        expect(component.player).toEqual(mockLobbyPlayers[0]);
        expect(component.movementPointsArray).toEqual(Array(mockLobbyPlayers[0].attributes.speed));
    });
});
