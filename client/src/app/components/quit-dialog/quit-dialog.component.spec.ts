import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { QuitDialogComponent } from './quit-dialog.component';

describe('QuitDialogComponent', () => {
    let component: QuitDialogComponent;
    let fixture: ComponentFixture<QuitDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<QuitDialogComponent>>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [QuitDialogComponent],
            providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
        }).compileComponents();

        fixture = TestBed.createComponent(QuitDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close the dialog with "yes" when yesClick is called', () => {
        component.yesClick();
        expect(mockDialogRef.close).toHaveBeenCalledWith('yes');
    });

    it('should close the dialog with "no" when noClick is called', () => {
        component.noClick();
        expect(mockDialogRef.close).toHaveBeenCalledWith('no');
    });
});
