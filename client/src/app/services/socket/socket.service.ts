import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    socket: Socket;

    isSocketAlive() {
        return this.socket && this.socket.connected;
    }

    connect() {
        if (!this.isSocketAlive()) {
            this.socket = io(`${environment.serverGatewayUrl}/gameSession`, { transports: ['websocket'], upgrade: false });
        }
    }

    disconnect() {
        if (this.isSocketAlive()) {
            this.socket.disconnect();
        }
    }

    on<T>(event: string, action: (data: T) => void): void {
        if (this.socket) this.socket.on(event, action);
    }

    send<T>(event: string, data?: T): void {
        if (this.isSocketAlive()) {
            if (data) this.socket.emit(event, data);
            else this.socket.emit(event);
        }
    }

    getId(): string {
        return this.isSocketAlive() && this.socket.id ? this.socket.id : '';
    }

    off<T>(event: string, action: (data: T) => void) {
        if (this.isSocketAlive()) {
            this.socket.off(event, action);
        }
    }
}
