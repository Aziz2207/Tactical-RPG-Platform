import { TestBed } from '@angular/core/testing';
import { Socket } from 'socket.io-client'; // io doit reussir le premier test
// import { environment } from 'src/environments/environment';
import { SocketService } from './socket.service';

const mockIo = jasmine.createSpy('io').and.returnValue({
    connect: jasmine.createSpy('connect'),
    disconnect: jasmine.createSpy('disconnect'),
    on: jasmine.createSpy('on'),
    off: jasmine.createSpy('off'),
    emit: jasmine.createSpy('emit'),
    conncected: false,
    id: '1234',
});

describe('SocketService', () => {
    let service: SocketService;
    let mockSocket: jasmine.SpyObj<Socket>;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(SocketService);
        mockSocket = jasmine.createSpyObj('Socket', ['connect', 'disconnect', 'on', 'off', 'emit']);
        service.socket = mockSocket;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should not reconnect if already connected', () => {
        service.socket.connected = true;
        service.connect();
        expect(mockIo).not.toHaveBeenCalled();
    });

    it('should disconnect if already connected', () => {
        service.socket.connected = true;
        service.disconnect();
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should do nothing if socket is not connected', () => {
        service.socket.connected = false;
        service.disconnect();
        expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should return true if socket is connected', () => {
        service.socket.connected = true;
        expect(service.isSocketAlive()).toBe(true);
    });

    it('should return false if socket is not connected', () => {
        service.socket.connected = false;
        expect(service.isSocketAlive()).toBe(false);
    });

    it('should register an event listener', () => {
        const event = 'event';
        const action = jasmine.createSpy('action');
        service.on(event, action);
        expect(mockSocket.on).toHaveBeenCalledWith(event, action);
    });

    it('should emit an event with data', () => {
        service.socket.connected = true;
        const event = 'event';
        const data = { key: 'value' };
        service.send(event, data);
        expect(mockSocket.emit).toHaveBeenCalledWith(event, data);
    });

    it('should emit an event without data', () => {
        service.socket.connected = true;
        const event = 'event';
        service.send(event);
        expect(mockSocket.emit).toHaveBeenCalledWith(event);
    });

    it('should return the socket id if the socket is connected', () => {
        const socketId = '1234';
        service.socket.id = socketId;
        service.socket.connected = true;
        expect(service.getId()).toBe(socketId);
    });

    it('should not return an id if the socket is not connected', () => {
        service.socket.connected = false;
        expect(service.getId()).toBe('');
    });

    it('should remove an event listener', () => {
        const event = 'event';
        const action = jasmine.createSpy('action');
        service.socket.connected = true;
        service.off(event, action);
        expect(mockSocket.off).toHaveBeenCalledWith(event, action);
    });

    it('should do nothing if the socket is not connected', () => {
        const event = 'event';
        const action = jasmine.createSpy('action');
        service.socket.connected = false;
        service.off(event, action);
        expect(mockSocket.off).not.toHaveBeenCalled();
    });
});
