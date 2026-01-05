import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { IMessage } from '@app/interfaces/backend-interfaces/message.interface';
import { ChatMessage } from '@app/interfaces/chat-message';
import { LogMessage } from '@app/interfaces/log-message';
import { playerNavigation } from '@app/mocks/mock-player';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Player } from '@common/interfaces/player';
import { environment } from 'src/environments/environment';
import { ChatService } from './chat.service';

describe('ChatService', () => {
    let service: ChatService;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let httpMock: HttpTestingController;
    const chatsUrl = `${environment.serverUrl}/chat`;
    let mockPlayer: Player[];

    beforeEach(() => {
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['send', 'on']);

        mockPlayer = new Array(playerNavigation);

        TestBed.configureTestingModule({
            imports: [],
            providers: [
                ChatService,
                {
                    provide: SocketCommunicationService,
                    useValue: socketCommunicationServiceSpy,
                },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(ChatService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should send message', () => {
        const username = 'Player';
        const content = 'I am the prince of all Saiyans !';
        service.sendMessage(content);
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('sendMessages', {
            username,
            message: content,
            timestamp: jasmine.any(Date),
        });
    });

    it('should receive message', () => {
        const message: IMessage = {
            username: 'Goku',
            message: "Hey it's me Goku !",
            timestamp: new Date(),
        };
        const callback = jasmine.createSpy();
        service.onMessageReceived(callback);
        socketCommunicationServiceSpy.on.calls.mostRecent().args[1](message);
        expect(callback).toHaveBeenCalled();
    });

    it('should receive log', () => {
        const logMessage: LogMessage = {
            id: 1,
            message: 'Log message',
            timestamp: new Date(),
            players: mockPlayer,
        };
        const callback = jasmine.createSpy();
        service.onLogReceived(callback);
        socketCommunicationServiceSpy.on.calls.mostRecent().args[1](logMessage);
        expect(callback).toHaveBeenCalled();
    });

    it('should get messages by room', () => {
        const roomCode = 'room123';
        const mockBackendMessages: ChatMessage[] = [
            { id: 1, username: 'User1', message: 'Hello', timestamp: new Date() },
            { id: 2, username: 'User2', message: 'Hi', timestamp: new Date() },
        ];

        const mockTransformedMessages: ChatMessage[] = mockBackendMessages.map((backendMessage) => ({
            id: 1,
            username: backendMessage.username,
            message: backendMessage.message,
            timestamp: backendMessage.timestamp,
        }));

        spyOn(service, 'generateUniqueId').and.returnValue(1);

        service.getMessagesByRoom(roomCode).subscribe((messages) => {
            expect(messages).toEqual(mockTransformedMessages);
        });

        const req = httpMock.expectOne((request) => request.url === chatsUrl && request.params.get('roomCode') === roomCode);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('roomCode')).toBe(roomCode);
        req.flush(mockBackendMessages);
    });
});
