import { SocketTestHelper } from './socket-test-helper';

describe('SocketTestHelper', () => {
    let socketHelper: SocketTestHelper;

    beforeEach(() => {
        socketHelper = new SocketTestHelper();
    });

    it('should connected be false at initialization', () => {
        expect(socketHelper.connected).toBeFalse();
    });

    it('should set connected to true when connect is called', () => {
        socketHelper.connect();
        expect(socketHelper.connected).toBeTrue();
    });

    it('should set connected to false when disconnect is called', () => {
        socketHelper.disconnect();
        expect(socketHelper.connected).toBeFalse();
    });

    it('should call the callback function when on is called for a specific event', () => {
        const mockCallback = jasmine.createSpy('callback');
        const eventData = { test: 'data' };
        socketHelper.on('testEvent', mockCallback);
        socketHelper.on('testEvent', (data) => {
            mockCallback(data);
        });

        expect(mockCallback).toHaveBeenCalledWith(eventData);
    });

    it('should call the callback function when once is called for a specific event', () => {
        const mockCallback = jasmine.createSpy('callback');
        const eventData = { test: 'data' };
        socketHelper.once('testEvent', mockCallback);
        socketHelper.once('testEvent', (data) => {
            mockCallback(data);
        });

        expect(mockCallback).toHaveBeenCalledWith(eventData);
    });

    it('should not call the callback function for a different event', () => {
        const mockCallback = jasmine.createSpy('callback');
        socketHelper.on('anotherEvent', mockCallback);
        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle emit without errors', () => {
        expect(() => {
            socketHelper.emit('testEvent', { test: 'data' });
        }).not.toThrow();
    });

    it('should handle off', () => {
        expect(() => {
            socketHelper.off('testEvent');
        }).not.toThrow();
    });
});
