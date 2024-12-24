import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImportErrorDialogComponent } from './import-error-dialog.component';

describe('ImportErrorDialogComponent', () => {
    let component: ImportErrorDialogComponent;
    let fixture: ComponentFixture<ImportErrorDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<ImportErrorDialogComponent>>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [ImportErrorDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: 'Test import error message' },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ImportErrorDialogComponent);
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
        expect(compiled.querySelector('p')?.textContent).toContain('Test import error message');
    });
});
