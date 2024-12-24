import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { ChatComponent } from './chat.component';

describe('ChatComponent', () => {
    let component: ChatComponent;
    let fixture: ComponentFixture<ChatComponent>;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let roomManagerSpy: jasmine.SpyObj<RoomManagerService>;

    const mockMessages = [
        { userId: 'user1', text: 'Hello', time: '10:00' },
        { userId: 'user2', text: 'Hi there', time: '10:01' },
    ];

    let socketEventCallbacks: { [event: string]: (data: unknown) => void } = {};

    beforeEach(async () => {
        socketServiceSpy = jasmine.createSpyObj('SocketService', ['send', 'on']);
        roomManagerSpy = jasmine.createSpyObj('RoomManagerService', [], { player: { userName: 'user1' } });

        await TestBed.configureTestingModule({
            imports: [FormsModule],
            providers: [
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: RoomManagerService, useValue: roomManagerSpy },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        socketEventCallbacks = {};
        socketServiceSpy.on.and.callFake((event: string, callback: unknown) => {
            socketEventCallbacks[event] = callback as (data: unknown) => void;
        });

        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        component.messagesContainer = { nativeElement: { scrollTop: 0, scrollHeight: 100 } } as ElementRef;
        component.roomId = '1234';
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load message history on initialization', fakeAsync(() => {
        component.ngAfterViewInit();

        // Simulate receiving the message history
        if (socketEventCallbacks['messageHistory']) {
            socketEventCallbacks['messageHistory'](mockMessages);
        }

        tick();
        fixture.detectChanges();

        expect(component.messages.length).toBe(2);
        expect(component.messages[0].text).toBe('Hello');
        expect(component.messages[1].text).toBe('Hi there');
    }));

    it('should send a message when addMessage is called', () => {
        component.newMessage = 'Test message';
        component.addMessage();

        expect(socketServiceSpy.send).toHaveBeenCalledWith('roomMessage', { roomId: component.roomId, text: 'Test message' });
        expect(component.newMessage).toBe('');
    });

    it('should display received messages correctly', fakeAsync(() => {
        component.ngAfterViewInit();

        // Simulate receiving a new message
        if (socketEventCallbacks['roomMessage']) {
            socketEventCallbacks['roomMessage']({ userId: 'user2', text: 'New message', time: '10:02' });
        }

        tick();
        fixture.detectChanges();

        expect(component.messages.length).toBe(1);
        expect(component.messages[0].text).toBe('New message');
        expect(component.getMessageClass(component.messages[0])).toBe('received');
    }));

    it('should correctly classify messages from the current user as sent', () => {
        const message = { user: 'user1', text: 'My message', time: '10:03' };
        expect(component.getMessageClass(message)).toBe('sent');
    });

    it('should correctly classify messages from other users as received', () => {
        const message = { user: 'user2', text: 'Another message', time: '10:04' };
        expect(component.getMessageClass(message)).toBe('received');
    });

    it('should scroll to bottom when messages are updated', fakeAsync(() => {
        spyOn(component, 'scrollToBottom');

        component.messages.push({ user: 'user2', text: 'Another message', time: '10:04' });
        component.ngAfterViewInit();

        tick();
        expect(component.scrollToBottom).toHaveBeenCalled();
    }));
});
