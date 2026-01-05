import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ChatMessage } from '@app/interfaces/chat-message';
import { ChatService } from '@app/services/sockets/chat/chat.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Player } from '@common/interfaces/player';
import { BehaviorSubject, of } from 'rxjs';
import { Socket } from 'socket.io-client';
import { PrivateChatBoxComponent } from './private-chat-box.component';

describe('ChatBoxComponent', () => {
    let component: PrivateChatBoxComponent;
    let fixture: ComponentFixture<PrivateChatBoxComponent>;
    let chatServiceSpy: jasmine.SpyObj<ChatService>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let queryParamsSubject: BehaviorSubject<{ roomCode: string }>;
    let httpMock: HttpTestingController;
    let mockMessages: ChatMessage[];
    let mockPlayer: Player[];

    beforeEach(async () => {
        chatServiceSpy = jasmine.createSpyObj('ChatService', ['onMessageReceived', 'sendMessage', 'getMessagesByRoom', 'onLogReceived']);
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', [], {
            socket: { id: '123' } as Socket,
        });
        queryParamsSubject = new BehaviorSubject({ roomCode: '1234' });
        mockMessages = [
            { id: 1, username: 'User1', message: 'Hello', timestamp: new Date() },
            { id: 2, username: 'User2', message: 'Hi', timestamp: new Date() },
        ];
        chatServiceSpy.getMessagesByRoom.and.returnValue(of(mockMessages));

        mockPlayer = [{ id: '123', username: 'Goku' } as unknown as Player];

        await TestBed.configureTestingModule({
            imports: [PrivateChatBoxComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ChatService, useValue: chatServiceSpy },
                { provide: ActivatedRoute, useValue: { queryParams: queryParamsSubject.asObservable() } },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
            ],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PrivateChatBoxComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load messages', () => {
        // eslint-disable-next-line -- loadMessages is private and we want to spyOn
        spyOn<any>(component, 'loadMessages').and.callThrough();
        component.ngOnInit();

        expect(component['loadMessages']).toHaveBeenCalled();
        expect(chatServiceSpy.getMessagesByRoom).toHaveBeenCalledWith('1234');
        expect(component.messages).toEqual(mockMessages);
    });

    it('should set roomCode on init', () => {
        component.ngOnInit();
        expect(component.roomCode).toBe('1234');
    });

    it('should send message', () => {
        const message = "Hey it's me Goku !";
        component.newMessage = message;
        component.sendMessage();
        expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith(message);
        expect(component.newMessage).toBe('');
    });

    it('should receive log and push it to the two arrays if player is concerned', () => {
        const logMessage = {
            id: 1,
            message: 'Goku has joined the room',
            players: mockPlayer,
            timestamp: new Date(),
        };
        chatServiceSpy.onLogReceived.calls.mostRecent().args[0](logMessage);
        component.ngOnInit();
        expect(component.logs).toContain(logMessage);
        expect(component.filteredLogs).toContain(logMessage);
    });

    it('should receive log and push it to the non filtered if player is NOT concerned', () => {
        socketCommunicationServiceSpy.socket.id = '213';
        const logMessage = {
            id: 1,
            message: 'Goku has joined the room',
            players: mockPlayer,
            timestamp: new Date(),
        };
        chatServiceSpy.onLogReceived.calls.mostRecent().args[0](logMessage);
        component.ngOnInit();
        expect(component.logs).toContain(logMessage);
        expect(component.filteredLogs).not.toContain(logMessage);
    });

    it('should return true if player is in log', () => {
        const logMessage = {
            id: 1,
            message: 'Goku has joined the room',
            players: [{ id: '123', username: 'Goku' } as unknown as Player],
            timestamp: new Date(),
        };
        const result = component['isPlayerInLog'](logMessage);
        expect(result).toBe(true);
    });

    it('should return false if player is not in log', () => {
        const logMessage = {
            id: 1,
            message: 'Vegeta has joined the room',
            players: [{ id: '456', username: 'Vegeta' } as unknown as Player],
            timestamp: new Date(),
        };
        const result = component['isPlayerInLog'](logMessage);
        expect(result).toBe(false);
    });

    it('should scroll to bottom', () => {
        const messageContainer = document.createElement('div');
        const scrollHeight = 100;

        Object.defineProperty(messageContainer, 'scrollHeight', { value: scrollHeight, configurable: true });

        messageContainer.scrollTop = 0;
        component.messageContainer = new ElementRef(messageContainer);

        component['scrollToBottom']();

        Object.defineProperty(messageContainer, 'scrollTop', { value: scrollHeight, writable: true });

        expect(messageContainer.scrollTop).toBe(scrollHeight);
    });

    it('should toggle chat logs visibility and update chatType correctly', () => {
        component.isToggleable = true;
        component.areLogsVisible = false;
        component.chatType = 'Messagerie';

        component.toggleChatLogs();

        expect(component.areLogsVisible).toBe(true);
        expect(component.chatType).toBe('Journal de jeu non filtré');
        component.toggleChatLogs();

        expect(component.areLogsVisible).toBe(false);
        expect(component.chatType).toBe('Messagerie');
    });

    it('should return "icon-logs" when areLogsVisible is true', () => {
        component.areLogsVisible = true;
        expect(component.toggleIconClass).toBe('icon-logs');
    });

    it('should return "icon-chat" when areLogsVisible is false', () => {
        component.areLogsVisible = false;
        expect(component.toggleIconClass).toBe('icon-chat');
    });

    it('should toggle areLogsFiltered and update chatType to "Journal de jeu filtré" when areLogsFiltered is false', () => {
        component['scrollToBottom']();
        component.areLogsFiltered = false;
        component.toggleLogsFilter();
        expect(component.areLogsFiltered).toBe(true);
        expect(component.chatType).toBe('Journal de jeu filtré');
    });

    it('should toggle areLogsFiltered and update chatType to "Journal de jeu non filtré" when areLogsFiltered is true', () => {
        component.areLogsFiltered = true;
        component.toggleLogsFilter();
        expect(component.areLogsFiltered).toBe(false);
        expect(component.chatType).toBe('Journal de jeu non filtré');
    });

    it('should emit true when onFocus is called', () => {
        spyOn(component.chatFocusChange, 'emit');
        component.onFocus();
        expect(component.chatFocusChange.emit).toHaveBeenCalledWith(true);
    });

    it('should emit false when onBlur is called', () => {
        spyOn(component.chatFocusChange, 'emit');
        component.onBlur();
        expect(component.chatFocusChange.emit).toHaveBeenCalledWith(false);
    });
});
