import { ToolButtonComponent } from '@app/components/map-editor/tool-button/tool-button.component';
import { ToolButtonService } from './tool-button.service';

describe('ToolButtonService', () => {
    let service: ToolButtonService;
    let button: ToolButtonComponent;

    beforeEach(() => {
        service = new ToolButtonService();
        button = new ToolButtonComponent(service);
    });

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    it('should disable the button if it is already active', () => {
        button.isActive = true;
        service.selectedButton = button;

        service.toggleButton(button);
        expect(button.isActive).toBeFalsy();
    });

    it('should enable the new button and disable the other one that was already active', () => {
        button.isActive = false;
        const currentActiveButton = new ToolButtonComponent(service);
        service.selectedButton = currentActiveButton;
        service.toggleButton(button);
        expect(button.isActive).toBeTruthy();
        expect(service.selectedButton).toBe(button);
    });

    it('should enable the the new button if there was not an already active one', () => {
        button.isActive = false;
        service.selectedButton = null;
        service.toggleButton(button);
        expect(button.isActive).toBeTruthy();
    });

    it('should change the selected button', () => {
        button.isActive = false;
        service.toggleButton(button);
        expect(service.selectedButton).toBe(button);
    });
});
