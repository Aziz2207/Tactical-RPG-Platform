import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EditErrorDialogComponent } from './edit-error-dialog.component';

describe('EditErrorDialogComponent', () => {
    let component: EditErrorDialogComponent;
    let fixture: ComponentFixture<EditErrorDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<EditErrorDialogComponent>>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [EditErrorDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { message: 'Test error message' } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditErrorDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close dialog when onCloseClick is called', () => {
        component.onCloseClick();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should display the message passed in MAT_DIALOG_DATA', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('p')?.textContent).toContain('Test error message');
    });
});
