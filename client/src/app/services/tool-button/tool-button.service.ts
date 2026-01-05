import { Injectable } from '@angular/core';
import { ToolButtonComponent } from '@app/components/map-editor/tool-button/tool-button.component';

@Injectable({
    providedIn: 'root',
})
export class ToolButtonService {
    selectedButton: ToolButtonComponent | null = null;

    toggleButton(buttonToActivate: ToolButtonComponent) {
        if (this.selectedButton === null) {
            this.selectedButton = buttonToActivate;
            buttonToActivate.toggleActivation();
        } else if (this.selectedButton === buttonToActivate) {
            this.selectedButton.toggleActivation();
            this.selectedButton = null;
        } else {
            this.selectedButton.toggleActivation();
            this.selectedButton = buttonToActivate;
            buttonToActivate.toggleActivation();
        }
    }
}
