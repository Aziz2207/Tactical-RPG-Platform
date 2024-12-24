import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-game-item',
    standalone: true,
    imports: [NgClass],
    templateUrl: './game-item.component.html',
    styleUrl: './game-item.component.scss',
})
export class GameItemComponent {
    @Input() game: { title: string; _id: string; isVisible: boolean };
    @Input() selected: boolean = true;
}
