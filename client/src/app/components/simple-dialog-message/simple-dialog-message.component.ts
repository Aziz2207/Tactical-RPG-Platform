import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-simple-dialog-message',
    standalone: true,
    imports: [],
    templateUrl: './simple-dialog-message.component.html',
    styleUrl: './simple-dialog-message.component.scss',
})
export class SimpleDialogMessageComponent {
    @Input() message: string = '';
}
