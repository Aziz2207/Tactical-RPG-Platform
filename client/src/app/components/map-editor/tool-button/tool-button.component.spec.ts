import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContainerToolsComponent } from '@app/components/map-editor/container-tools/container-tools.component';
import { ToolButtonService } from '@app/services/tool-button/tool-button.service';
import { ToolButtonComponent } from './tool-button.component';

import SpyObj = jasmine.SpyObj;

describe('ToolButtonComponent', () => {
    let component: ToolButtonComponent;
    let fixture: ComponentFixture<ToolButtonComponent>;
    let toolButtonServiceSpy: SpyObj<ToolButtonService>;

    beforeEach(async () => {
        toolButtonServiceSpy = jasmine.createSpyObj('ToolButtonService', ['toggleButton']);
        await TestBed.configureTestingModule({
            imports: [ContainerToolsComponent, ToolButtonComponent],
        }).compileComponents();
        TestBed.overrideProvider(ToolButtonService, { useValue: toolButtonServiceSpy });

        fixture = TestBed.createComponent(ToolButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('toogleSelf should call toggleButton in the service', () => {
        component.toggleSelf();
        expect(toolButtonServiceSpy.toggleButton).toHaveBeenCalled();
    });

    it('should change its isActive attribute with toggleActivation', () => {
        component.isActive = false;
        component.toggleActivation();
        expect(component.isActive).toBeTruthy();

        component.isActive = true;
        component.toggleActivation();
        expect(component.isActive).toBeFalsy();
    });

    it('should return "inactive" when isActive is false', () => {
        component.isActive = false;
        expect(component.class).toBe('');
    });

    it('should return "active inactive" when isActive is true', () => {
        component.isActive = true;
        expect(component.class).toBe('active');
    });
});
