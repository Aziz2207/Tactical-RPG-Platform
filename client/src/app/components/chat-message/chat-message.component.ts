import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-chat-message',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './chat-message.component.html',
    styleUrl: './chat-message.component.scss',
})
export class ChatMessageComponent {
    private readonly defaultAvatar = 'assets/images/icones/missing-avatar.png';
    avatarSrc: string = this.defaultAvatar;

    @Input() timestamp: Date;
    @Input() username?: string;
    @Input() message: string;

    private _avatarUrl?: string | null;

    @Input()
    set avatarUrl(value: string | null | undefined) {
        this._avatarUrl = value;
        this.avatarSrc = value || this.defaultAvatar;
    }

    get avatarUrl() {
        return this._avatarUrl;
    }

    handleAvatarError(event: Event) {
        const target = event.target as HTMLImageElement;
        if (target && target.src !== this.defaultAvatar) {
            target.src = this.defaultAvatar;
            this.avatarSrc = this.defaultAvatar;
        }
    }
}
