import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AdminService } from '@app/services/admin/admin.service';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { CONSTANTS } from '@common/constants';
import { ModeEnum } from '@common/mode-enum';
import { AddGameDialogComponent } from './add-game-dialog.component';

describe('AddGameDialogComponent', () => {
    let component: AddGameDialogComponent;
    let fixture: ComponentFixture<AddGameDialogComponent>;
    let mockAdminService: jasmine.SpyObj<AdminService>;
    let mockMapEditerService: jasmine.SpyObj<MapEditorService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<AddGameDialogComponent>>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockAdminService = jasmine.createSpyObj('AdminService', ['addGame']);
        mockMapEditerService = jasmine.createSpyObj('MapEditerService', ['createGame']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: AdminService, useValue: mockAdminService },
                { provide: MapEditorService, useValue: mockMapEditerService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AddGameDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close the dialog when onNoClick is called', () => {
        component.onNoClick();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should submit a form when valid and call the services', () => {
        component.adminForm.controls['size'].setValue(CONSTANTS.SMALL_MAP_SIZE);
        component.adminForm.controls['mode'].setValue(ModeEnum.CTF);
        component.onNextClick();
        expect(mockAdminService.addGame).toHaveBeenCalledWith(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
        expect(mockMapEditerService.createGame).toHaveBeenCalledWith(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
        expect(mockDialogRef.close).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/edit']);
    });

    it('should initialize the form with default values', () => {
        expect(component.adminForm.controls['size'].value).toBe('10');
        expect(component.adminForm.controls['mode'].value).toBe('Classique');
    });

    it('should update form values when selectOption is called', () => {
        component.selectOption('size', '20');
        component.selectOption('mode', 'CTF');
        expect(component.adminForm.controls['size'].value).toBe('20');
        expect(component.adminForm.controls['mode'].value).toBe('CTF');
    });

    it('should update the size when setSize is called', () => {
        component.setSize('15');
        expect(component.adminForm.get('size')?.value).toBe('15');
    });

    it('should update the mode when setMode is called', () => {
        component.setMode('CTF');
        expect(component.adminForm.get('mode')?.value).toBe('CTF');
    });

    it('should handle invalid form submission gracefully', () => {
        component.adminForm.controls['size'].setValue('');
        component.adminForm.controls['mode'].setValue('');
        component.onNextClick();
        expect(mockAdminService.addGame).not.toHaveBeenCalled();
        expect(mockMapEditerService.createGame).not.toHaveBeenCalled();
        expect(mockDialogRef.close).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
});
