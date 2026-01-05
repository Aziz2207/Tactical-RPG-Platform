import { TestEventData } from '@app/interfaces/test-event-data';

export class SocketTestHelper {
    connected = false;
    connect(): void {
        this.connected = true;
    }

    disconnect(): void {
        this.connected = false;
    }

    on(event: string, action: (data: TestEventData) => void): void {
        if (event === 'testEvent') {
            action({ test: 'data' });
        }
    }

    emit(event: string, data: TestEventData): void {
        if (event === 'testEvent' && data) {
            return;
        }
    }

    once(event: string, action: (data: TestEventData) => void): void {
        if (event === 'testEvent') {
            action({ test: 'data' });
        }
    }

    off(event: string): void {
        if (event === 'testEvent') {
            return;
        }
    }
}
