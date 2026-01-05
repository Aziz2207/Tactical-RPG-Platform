import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { INIT_DISPLAY_DELAY } from '@app/constants';
import { TemporaryDialogComponent } from './temporary-dialog.component';

describe('TemporaryDialogComponent', () => {
    let component: TemporaryDialogComponent;
    let fixture: ComponentFixture<TemporaryDialogComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<TemporaryDialogComponent>>;

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [MatDialogModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        message: 'Test message',
                        title: 'Test title',
                        duration: INIT_DISPLAY_DELAY,
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TemporaryDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should close the dialog after the specified duration using done callback', (done) => {
        setTimeout(() => {
            expect(dialogRefSpy.close).toHaveBeenCalled();
            done();
        }, INIT_DISPLAY_DELAY);
    });
});
