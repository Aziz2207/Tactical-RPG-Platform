import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectType, VICTORIES_FOR_WIN } from '@app/constants';
import { mockPlayers } from '@app/mocks/mock-players';
import { PostGameService } from '@app/services/post-game/post-game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Status } from '@common/interfaces/player';
import { gameObjects } from '@common/objects-info';
import { Socket } from 'socket.io-client';
import { PlayerStatisticsComponent } from './player-statistics.component';
/* eslint-disable  @typescript-eslint/no-non-null-assertion */
describe('PlayerStatisticsComponent', () => {
    let component: PlayerStatisticsComponent;
    let fixture: ComponentFixture<PlayerStatisticsComponent>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let postGameServiceSpy: jasmine.SpyObj<PostGameService>;
    let mockSocket: Socket;

    beforeEach(async () => {
        mockSocket = { data: { roomCode: '1234' }, id: 'player' } as unknown as Socket;
        socketCommunicationServiceSpy = jasmine.createSpyObj(SocketCommunicationService, ['send']);
        postGameServiceSpy = jasmine.createSpyObj(PostGameService, ['isFlagMode', 'isAttributeVictories', 'getMaxStat']);
        await TestBed.configureTestingModule({
            imports: [PlayerStatisticsComponent],
            providers: [
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: PostGameService, useValue: postGameServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerStatisticsComponent);
        component = fixture.componentInstance;
        component.player = { ...mockPlayers[0] };
        socketCommunicationServiceSpy.socket = mockSocket;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return the winner', () => {
        const flag = gameObjects.find((items) => items.id === ObjectType.Flag);
        postGameServiceSpy.isFlagMode = true;
        component.player = { ...mockPlayers[0] };
        component.player.inventory = [flag!];
        component.player.postGameStats.victories = VICTORIES_FOR_WIN;
        expect(component.isWinner()).toBeDefined();

        postGameServiceSpy.isFlagMode = false;
        expect(component.isWinner()).toBeTrue();
    });

    it('should return the correct status', () => {
        component.player = { ...mockPlayers[0] };
        component.player.status = Status.Admin;
        expect(component.getStatusClass()).toEqual(Status.Admin);
    });

    it('should get the socket id', () => {
        mockSocket.id = '1';
        expect(component.getSocketId()).toEqual(mockSocket.id);
    });
});
