import { TestBed } from '@angular/core/testing';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { Socket } from 'socket.io-client';
import { SocketCommunicationService } from './socket-communication.service';

describe('SocketCommunicationService', () => {
    let service: SocketCommunicationService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(SocketCommunicationService);
    });

    it('should connect', () => {
        const spy = spyOn(service, 'connect').and.callThrough();
        service.connect();
        expect(spy).toHaveBeenCalled();
    });

    it('should not connect if socket is already connected', () => {
        const initialSocket = service.socket;
        spyOn(service, 'isSocketAlive').and.returnValue(true);

        service.connect();
        expect(service.socket).toBe(initialSocket);
    });

    // Tests from SocketIO exemple LOG2990
    describe('socket helper', () => {
        beforeEach(() => {
            service.socket = new SocketTestHelper() as unknown as Socket;
        });

        it('should disconnect', () => {
            const spy = spyOn(service.socket, 'disconnect');
            service.disconnect();
            expect(spy).toHaveBeenCalled();
        });

        it('isSocketAlive should return true if the socket is still connected', () => {
            service.socket.connected = true;
            const isAlive = service.isSocketAlive();
            expect(isAlive).toBeTruthy();
        });

        it('isSocketAlive should return false if the socket is no longer connected', () => {
            service.socket.connected = false;
            const isAlive = service.isSocketAlive();
            expect(isAlive).toBeFalsy();
        });

        it('isSocketAlive should return false if the socket is not defined', () => {
            (service.socket as unknown) = undefined;
            const isAlive = service.isSocketAlive();
            expect(isAlive).toBeFalsy();
        });

        it('should call socket.on with an event', () => {
            const event = 'helloWorld';
            const action = () => {
                'test';
            };
            const spy = spyOn(service.socket, 'on');
            service.on(event, action);
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(event, action);
        });

        it('should call emit with data when using send', () => {
            const event = 'helloWorld';
            const data = 42;
            const spy = spyOn(service.socket, 'emit');
            service.send(event, data);
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(event, data);
        });

        it('should call emit without data when using send if data is undefined', () => {
            const event = 'helloWorld';
            const data = undefined;
            const spy = spyOn(service.socket, 'emit');
            service.send(event, data);
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(event);
        });

        it('should call socket.on with an event', () => {
            const event = 'helloWorld';
            const action = () => {
                'test';
            };
            const spy = spyOn(service.socket, 'once');
            service.once(event, action);
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(event, action);
        });

        it('should call socket.off with an event', () => {
            const event = 'helloWorld';
            const spy = spyOn(service.socket, 'off');
            service.send(event);
            service.off(event);
            expect(spy).toHaveBeenCalledWith(event);
        });
    });
});
