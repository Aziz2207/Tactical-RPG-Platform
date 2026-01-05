import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-game-object',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './game-object.component.html',
    styleUrl: './game-object.component.scss',
})
export class GameObjectComponent {
    @Input() imageUrl: string;
    @Input() name: string;
    @Input() description: string;
    @Input() count?: number;
    @Input() id: number;
    @Input() isDragging: boolean;
    @Input() descriptionPosition: string;
    @Input() isLarge?: boolean;
}
