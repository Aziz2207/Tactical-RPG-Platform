import { Overlay } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { VirtualPlayerButtonComponent } from './virtual-player-button.component';

describe('VirtualPlayerButtonComponent', () => {
    let component: VirtualPlayerButtonComponent;
    let fixture: ComponentFixture<VirtualPlayerButtonComponent>;
    let mockDialog: jasmine.SpyObj<MatDialog>;

    beforeEach(async () => {
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [VirtualPlayerButtonComponent],
            providers: [{ provide: MatDialog, useValue: mockDialog }, Overlay],
        }).compileComponents();

        fixture = TestBed.createComponent(VirtualPlayerButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should disable the button when isRoomFull is true', () => {
        component.isRoomFull = true;
        fixture.detectChanges();

        const buttonElement: HTMLButtonElement = fixture.nativeElement.querySelector('.add-button');
        expect(buttonElement.disabled).toBeTrue();
    });

    it('should enable the button when isRoomFull is false', () => {
        component.isRoomFull = false;
        fixture.detectChanges();

        const buttonElement: HTMLButtonElement = fixture.nativeElement.querySelector('.add-button');
        expect(buttonElement.disabled).toBeFalse();
    });
});
