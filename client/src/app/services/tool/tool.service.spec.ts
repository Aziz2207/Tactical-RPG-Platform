import { TestBed } from '@angular/core/testing';
import { TileId } from '@app/constants';
import { ToolButtonService } from '@app/services/tool-button/tool-button.service';
import { ToolService } from './tool.service';

describe('ToolService', () => {
    let service: ToolService;
    let toolButtonServiceSpy: jasmine.SpyObj<ToolButtonService>;

    beforeEach(() => {
        toolButtonServiceSpy = jasmine.createSpyObj('ToolButtonService', ['toggleActivation']);

        TestBed.configureTestingModule({
            providers: [{ provide: ToolButtonService, useValue: toolButtonServiceSpy }],
        });
        service = TestBed.inject(ToolService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('setSelectedTile', () => {
        it('should set the selectedTile to the given tile if it is not already selected', () => {
            service.setSelectedTile(TileId.Water);
            expect(service.getSelectedTile()).toBe(TileId.Water);
        });

        it('should set the selectedTile to an empty string if the same tile is selected again', () => {
            service.setSelectedTile(TileId.Water);
            service.setSelectedTile(TileId.Water);
            expect(service.getSelectedTile()).toBe('');
        });

        it('should allow selecting a different tile', () => {
            service.setSelectedTile(TileId.Water);
            service.setSelectedTile(TileId.Ice);
            expect(service.getSelectedTile()).toBe(TileId.Ice);
        });
    });

    describe('getSelectedTile', () => {
        it('should return the current selected tile', () => {
            service.setSelectedTile(TileId.Wall);
            expect(service.getSelectedTile()).toBe(TileId.Wall);
        });

        it('should return undefined if no tile has been selected', () => {
            expect(service.getSelectedTile()).toBeUndefined();
        });
    });

    describe('ToolButtonService', () => {
        it('should toggle the selected button and set it to null when selectedButton is defined', () => {
            const mockButton = jasmine.createSpyObj('ToolButtonComponent', ['toggleActivation']);
            toolButtonServiceSpy.selectedButton = mockButton;
            spyOn(service, 'setSelectedTile');

            service.deactivateTileApplicator();

            expect(service.setSelectedTile).toHaveBeenCalledWith('');
            expect(mockButton.toggleActivation).toHaveBeenCalled();
            expect(toolButtonServiceSpy.selectedButton).toBeNull();
        });

        it('should not toggle any button or set selectedButton to null when no button is selected', () => {
            toolButtonServiceSpy.selectedButton = null;
            spyOn(service, 'setSelectedTile');

            service.deactivateTileApplicator();
            expect(service.setSelectedTile).toHaveBeenCalledWith('');
            expect(toolButtonServiceSpy.selectedButton).toBeNull();
        });
    });
});
