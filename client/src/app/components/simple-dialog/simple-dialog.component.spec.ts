import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { SimpleDialogMessageComponent } from '@app/components/simple-dialog-message/simple-dialog-message.component';
import { PathRoute } from '@common/interfaces/route';
import { gameObjects } from '@common/objects-info';
import { SimpleDialogComponent } from './simple-dialog.component';

describe('SimpleDialogComponent', () => {
    let component: SimpleDialogComponent;
    let fixture: ComponentFixture<SimpleDialogComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SimpleDialogComponent>>;
    let mockRouter: Router;

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, MatDialogModule, MatButtonModule, CommonModule, SimpleDialogMessageComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        messages: ['Test message'],
                        title: 'Test title',
                        confirm: true,
                        options: ['option1', 'option2'],
                        isInput: true,
                    },
                },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SimpleDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should close dialog with "left" when onClose is called with confirm true', () => {
        component.onClose();
        expect(dialogRefSpy.close).toHaveBeenCalledWith({
            action: 'left',
            input: '',
        });
    });

    it('should close dialog with "close" when onClose is called with confirm false', () => {
        component.data.confirm = false;
        component.onClose();
        expect(dialogRefSpy.close).toHaveBeenCalledWith({
            action: 'close',
            input: '',
        });
    });

    it('should close dialog with "right" when onCancel is called', () => {
        component.inputValue = 'Test Input';

        component.onCancel();

        expect(dialogRefSpy.close).toHaveBeenCalledWith({
            action: 'right',
            input: 'Test Input',
        });
    });

    it('should navigate to /administration when title is "Sauvegarde réussie"', () => {
        component.data.title = 'Sauvegarde réussie';
        component.onClose();
        expect(dialogRefSpy.close).toHaveBeenCalledWith({
            action: 'left',
            input: '',
        });
        expect(mockRouter.navigate).toHaveBeenCalledWith([PathRoute.Admin]);
    });

    it('should close dialog when close is called', () => {
        component.close();
        expect(dialogRefSpy.close).toHaveBeenCalled();
    });

    it('should pass the input value when onClose is called', () => {
        component.inputValue = 'Test Input';
        component.onClose();
        expect(dialogRefSpy.close).toHaveBeenCalledWith({
            action: 'left',
            input: 'Test Input',
        });
    });

    it('should pass null as input when onClose is called and isInput is false', () => {
        component.data.isInput = false;
        component.onClose();
        expect(dialogRefSpy.close).toHaveBeenCalledWith({
            action: 'left',
            input: null,
        });
    });

    it('should pass the input value when onCancel is called', () => {
        component.inputValue = 'Test Input';
        component.onCancel();
        expect(dialogRefSpy.close).toHaveBeenCalledWith({
            action: 'right',
            input: 'Test Input',
        });
    });

    it('should pass null as input when onCancel is called and isInput is false', () => {
        component.data.isInput = false;
        component.onCancel();
        expect(dialogRefSpy.close).toHaveBeenCalledWith({
            action: 'right',
            input: null,
        });
    });

    it('should set showError to true if onCancel is called with empty input and confirm is true', () => {
        component.inputValue = '';
        component.onCancel();
        expect(component.showError).toBeTrue();
    });

    it('should reset showError to false after a valid onCancel call', () => {
        component.inputValue = 'Valid Input';
        component.onCancel();
        expect(component.showError).toBeFalse();
    });

    it('should return either the itemSwap structure or null on swapItems', () => {
        const itemSwap = { currentItem1: gameObjects[0], currentItem2: gameObjects[1], pickedUpItem: gameObjects[2] };
        expect(component.swapItems(true, itemSwap)).toBeNull();
        component.data.itemSwap = itemSwap;
        expect(component.swapItems(true, itemSwap)).toEqual(component.data.itemSwap);
    });
});
