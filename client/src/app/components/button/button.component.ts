import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-button',
    standalone: true,
    imports: [],
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.scss'],
})
export class ButtonComponent {
    @Input() text: string = '';
}
