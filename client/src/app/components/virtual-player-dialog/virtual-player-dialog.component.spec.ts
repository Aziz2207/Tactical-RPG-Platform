import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { VirtualPlayerDialogComponent } from './virtual-player-dialog.component';

describe('VirtualPlayerDialogComponent', () => {
    let component: VirtualPlayerDialogComponent;
    let fixture: ComponentFixture<VirtualPlayerDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<VirtualPlayerDialogComponent>>;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['addVirtualPlayer']);

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule, VirtualPlayerDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: RoomManagerService, useValue: mockRoomManagerService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(VirtualPlayerDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize the form with default behaviour as Agressive', () => {
        expect(component.virtualForm.value.behaviour).toBe('Agressive');
    });

    it('should set behaviour to Agressive when setBehaviour is called with "Agressive"', () => {
        component.setBehaviour('Agressive');
        expect(component.virtualForm.value.behaviour).toBe('Agressive');
    });

    it('should set behaviour to Defensive when setBehaviour is called with "Defensive"', () => {
        component.setBehaviour('Defensive');
        expect(component.virtualForm.value.behaviour).toBe('Defensive');
    });

    it('should call RoomManagerService.addVirtualPlayer with true when behaviour is Agressive', () => {
        component.setBehaviour('Agressive');
        component.onCreateClick();
        expect(mockRoomManagerService.addVirtualPlayer).toHaveBeenCalledWith(true);
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should call RoomManagerService.addVirtualPlayer with false when behaviour is Defensive', () => {
        component.setBehaviour('Defensive');
        component.onCreateClick();
        expect(mockRoomManagerService.addVirtualPlayer).toHaveBeenCalledWith(false);
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should close the dialog when onCancelClick is called', () => {
        component.onCancelClick();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should update the form value when a behaviour button is clicked', () => {
        const behaviourButtons = fixture.nativeElement.querySelectorAll('.behaviour-button');
        behaviourButtons[0].click();
        fixture.detectChanges();
        expect(component.virtualForm.value.behaviour).toBe('Agressive');
        behaviourButtons[1].click();
        fixture.detectChanges();
        expect(component.virtualForm.value.behaviour).toBe('Defensive');
    });

    it('should update behaviour when selectBehaviour is called', () => {
        component.selectBehaviour('Defensive');
        expect(component.virtualForm.value.behaviour).toBe('Defensive');

        component.selectBehaviour('Agressive');
        expect(component.virtualForm.value.behaviour).toBe('Agressive');
    });
});
