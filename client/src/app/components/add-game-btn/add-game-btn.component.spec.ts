import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AddGameButtonComponent } from './add-game-btn.component';

describe('AddGameButtonComponent', () => {
    let component: AddGameButtonComponent;
    let fixture: ComponentFixture<AddGameButtonComponent>;
    let routerSpyObj: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
        const dialogRefSpyObj = jasmine.createSpyObj('MatDialogRef', ['afterClosed', 'close']);

        await TestBed.configureTestingModule({
            imports: [AddGameButtonComponent],
            providers: [
                { provide: Router, useValue: routerSpyObj },
                { provide: MatDialog, useValue: dialogRefSpyObj },
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AddGameButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the Plus button', () => {
        const buttonElement = fixture.debugElement.query(By.css('.add-button'));
        const iconElement = fixture.debugElement.query(By.css('p'));
        expect(buttonElement).toBeTruthy();
        expect(iconElement.nativeElement.textContent).toContain('+');
    });

    it('should call the openDialog() function when the plus button is clicked', () => {
        spyOn(component, 'openDialog');
        const buttonElement = fixture.debugElement.query(By.css('.add-button'));
        buttonElement.triggerEventHandler('click', null);
        expect(component.openDialog).toHaveBeenCalled();
    });

    it('should navigate to /add after dialog is closed with a result', () => {
        const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(true), close: null });
        spyOn(component['dialog'], 'open').and.returnValue(dialogRefSpyObj);

        component.openDialog();

        expect(component['dialog'].open).toHaveBeenCalled();
        expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
        expect(routerSpyObj.navigate).toHaveBeenCalledWith(['/add']);
    });
});
