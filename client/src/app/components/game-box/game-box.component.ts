import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ChatComponent } from '@app/components/chat/chat.component';
import { GameLogComponent } from '@app/components/game-log/game-log.component';

@Component({
    selector: 'app-game-box',
    standalone: true,
    imports: [MatIconModule, ChatComponent, GameLogComponent],
    templateUrl: './game-box.component.html',
    styleUrl: './game-box.component.scss',
})
export class GameBoxComponent {
    activeWindow: 'journal' | 'messages' = 'journal';

    switchWindow(window: 'journal' | 'messages'): void {
        this.activeWindow = window;
    }
}
