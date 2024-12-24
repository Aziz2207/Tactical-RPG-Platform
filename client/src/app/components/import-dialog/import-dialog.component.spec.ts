import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { CommunicationService } from '@app/services/communication/communication.service';
import { of } from 'rxjs';
import { ImportDialogComponent } from './import-dialog.component';

describe('ImportDialogComponent', () => {
    let component: ImportDialogComponent;
    let fixture: ComponentFixture<ImportDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<ImportDialogComponent>>;
    let mockHttp;
    let mockCommunicationService: jasmine.SpyObj<CommunicationService>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockHttp = jasmine.createSpyObj('HttpClient', ['get']);
        mockCommunicationService = jasmine.createSpyObj('CommunicationService', ['gamesGet']);
        mockCommunicationService.gamesGet.and.returnValue(of([{ title: 'Test Game', _id: '1', isVisible: true }]));

        await TestBed.configureTestingModule({
            imports: [ImportDialogComponent, ReactiveFormsModule],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { currentTitle: 'Existing Game Title' } },
                { provide: HttpClient, useValue: mockHttp },
                { provide: CommunicationService, useValue: mockCommunicationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ImportDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize the form with the current title', () => {
        const input = component.renameForm.controls['newTitle'];
        expect(input.value).toBe('Existing Game Title');
    });

    it('should close the dialog with the new title', () => {
        const input = component.renameForm.controls['newTitle'];
        input.setValue('New Game Title');
        component.onConfirm();
        expect(mockDialogRef.close).toHaveBeenCalledWith('New Game Title');
    });

    it('should set errorMessage if the title is empty', () => {
        const input = component.renameForm.controls['newTitle'];
        input.setValue('');
        component.onConfirm();
        expect(component.errorMessage).toBe('Le nom ne peut pas être vide');
        expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should close the dialog with null on cancel', () => {
        component.onCancel();
        expect(mockDialogRef.close).toHaveBeenCalledWith(null);
    });

    it('should reflect form changes', () => {
        const inputElement = fixture.debugElement.query(By.css('input')).nativeElement;
        inputElement.value = 'Updated Title';
        inputElement.dispatchEvent(new Event('input'));
        expect(component.renameForm.controls['newTitle'].value).toBe('Updated Title');
    });

    it('should call onConfirm when the confirm button is clicked', () => {
        const confirmButton = fixture.debugElement.query(By.css('.right-button'));
        spyOn(component, 'onConfirm');
        confirmButton.triggerEventHandler('click', null);
        expect(component.onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when the cancel button is clicked', () => {
        const cancelButton = fixture.debugElement.query(By.css('.left-button'));
        spyOn(component, 'onCancel');
        cancelButton.triggerEventHandler('click', null);
        expect(component.onCancel).toHaveBeenCalled();
    });

    it('should render the template correctly', () => {
        const message = fixture.debugElement.query(By.css('.dialog-container p')).nativeElement;
        expect(message.textContent).toContain('Le nom de jeu déjà utilisé');
        const input = fixture.debugElement.query(By.css('input')).nativeElement;
        input.value = 'Test Title';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(component.renameForm.controls['newTitle'].value).toBe('Test Title');
    });
});
