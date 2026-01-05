import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { mockAvatars } from '@app/mocks/mock-avatars';
import { mockAvatar, mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { mockRoom } from '@app/mocks/mock-room';
import { JoinGameService } from '@app/services/sockets/join-game/join-game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { JoinGameComponent } from './join-game.component';

describe('JoinGameComponent', () => {
    let component: JoinGameComponent;
    let fixture: ComponentFixture<JoinGameComponent>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let activatedRouteMock: jasmine.SpyObj<ActivatedRoute>;
    let code: string;

    beforeEach(async () => {
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['send', 'on', 'once', 'isSocketAlive', 'connect']);
        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', ['connect', 'joinLobby', 'handleJoinGame']);
        code = '1234';

        await TestBed.configureTestingModule({
            imports: [JoinGameComponent],
            providers: [
                { provide: ActivatedRoute, useValue: activatedRouteMock },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: JoinGameService, useValue: joinGameServiceSpy },
            ],
        }).compileComponents();

        socketCommunicationServiceSpy.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'characterSelected') {
                callback(mockAvatars as T);
            }
        });

        fixture = TestBed.createComponent(JoinGameComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call connect when connecting to page', () => {
        expect(joinGameServiceSpy.connect).toHaveBeenCalled();
        expect(component.availableAvatars).toEqual(mockAvatars);
    });

    describe('joinGame', () => {
        it('should set isCharacterFormVisible and availableAvatars when roomInfo is valid', () => {
            joinGameServiceSpy.handleJoinGame = jasmine.createSpy().and.callFake((_, cb) => {
                cb(mockRoom, '');
            });
            component.joinGame(code);

            expect(component.isCharacterFormVisible).toBe(true);
            expect(component.availableAvatars).toEqual(mockRoom.availableAvatars);
            expect(component.errorMessage).toBe('');
        });

        it('should set error message when room not found', () => {
            joinGameServiceSpy.handleJoinGame = jasmine.createSpy().and.callFake((_, cb) => {
                cb(null, 'test message error');
            });
            component.joinGame('test');
            expect(component.errorMessage).toEqual('test message error');
        });
    });

    it('should call joinLobby', () => {
        component.joinLobby(mockLobbyPlayers[0]);
        expect(joinGameServiceSpy.joinLobby).toHaveBeenCalledWith(mockLobbyPlayers[0]);
    });

    it('should send selected avatar to socketCommunicationService', () => {
        component.selectedAvatar(mockAvatar);
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('selectCharacter', mockAvatar);
    });

    it('should set isCharacterFormVisible to false when leaving a game and navigate to home', () => {
        component.leaveGame(code);
        expect(component.isCharacterFormVisible).toBeFalsy();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('leaveRoom', code);
        expect(component.accessCode).toBe('');
    });
});
