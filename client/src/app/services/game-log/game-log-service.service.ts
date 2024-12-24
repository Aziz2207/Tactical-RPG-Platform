import { Injectable } from '@angular/core';
import { SocketService } from '@app/services/socket/socket.service';
import { LogMessage } from '@common/interfaces/log-message';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameLogService {
    combatMessageSubject = new BehaviorSubject<string>('');
    combatMessage$ = this.combatMessageSubject.asObservable();
    private logMessages: LogMessage[] = [];
    private logMessagesSubject = new BehaviorSubject<LogMessage[]>([]);
    private roomId: string;
    private logListenerSubscription: Subscription = new Subscription();

    constructor(private socketService: SocketService) {}

    setRoomId(roomId: string): void {
        this.roomId = roomId;
        this.clearLogs();
        this.unsubscribeLogListener();
        this.initializeLogListener();
        this.requestInitialLogs();
    }

    getLogMessages(): Observable<LogMessage[]> {
        return this.logMessagesSubject.asObservable();
    }

    getPlayerId(): string {
        return this.socketService.getId();
    }

    clearLogs(): void {
        this.logMessages = [];
        this.logMessagesSubject.next([]);
    }

    private initializeLogListener(): void {
        this.logListenerSubscription.add(
            this.socketService.on<LogMessage>('gameLog', (message) => {
                this.logMessages.push(message);
                this.logMessagesSubject.next([...this.logMessages]);
                this.combatMessageSubject.next(message.content);
            }),
        );

        this.logListenerSubscription.add(
            this.socketService.on<LogMessage[]>('getInitialLogs', (logs) => {
                this.logMessages = logs;
                this.logMessagesSubject.next([...this.logMessages]);
            }),
        );
    }

    private requestInitialLogs(): void {
        if (this.roomId) {
            this.socketService.send('getInitialLogs', { roomId: this.roomId });
        }
    }
    private unsubscribeLogListener(): void {
        this.logListenerSubscription.unsubscribe();
        this.logListenerSubscription = new Subscription();
    }
}
