import { Component, EventEmitter, Output } from '@angular/core';
import { Game } from '@common/interfaces/game';

@Component({
    selector: 'app-import-button',
    standalone: true,
    imports: [],
    templateUrl: './import-button.component.html',
    styleUrls: ['./import-button.component.scss'],
})
export class ImportButtonComponent {
    @Output() importEvent = new EventEmitter<Game>();

    triggerImport(): void {
        const inputElement = document.getElementById('import-game') as HTMLInputElement;
        inputElement.click();
    }

    importGame(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input?.files?.[0]) {
            const file = input.files[0];
            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const gameData = JSON.parse(reader.result as string);
                    this.importEvent.emit(gameData);
                } catch (error) {
                    alert('Le fichier JSON est invalide');
                } finally {
                    input.value = '';
                }
            };

            reader.readAsText(file);
        }
    }
}
