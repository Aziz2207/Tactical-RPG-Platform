import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { InfoDialogComponent } from './info-dialog.component';

describe('InfoDialogComponent', () => {
    let component: InfoDialogComponent;
    let fixture: ComponentFixture<InfoDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<InfoDialogComponent>>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        await TestBed.configureTestingModule({
            imports: [InfoDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: Router, useValue: mockRouter },
                { provide: MAT_DIALOG_DATA, useValue: { message: 'Test' } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(InfoDialogComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the correct message', () => {
        const message = fixture.debugElement.query(By.css('p')).nativeElement;
        expect(message.textContent).toContain('Test');
    });

    it('should close the dialog when onReturnHome is called', () => {
        component.onReturnHome();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should navigate to /home when onReturnHome is called', () => {
        component.onReturnHome();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should close the dialog and navigate to /home', () => {
        const button = fixture.debugElement.query(By.css('button')).nativeElement;
        button.click();
        expect(mockDialogRef.close).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
});
