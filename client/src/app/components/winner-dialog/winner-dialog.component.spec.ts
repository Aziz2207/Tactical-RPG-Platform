import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Player } from '@common/interfaces/player';
import { WinnerDialogComponent } from './winner-dialog.component';

describe('WinnerDialogComponent', () => {
    let component: WinnerDialogComponent;
    let fixture: ComponentFixture<WinnerDialogComponent>;
    let router: jasmine.SpyObj<Router>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<WinnerDialogComponent>>;

    const mockDialogData = {
        winner: {
            userName: 'player',
        } as Player,
    };

    beforeEach(async () => {
        router = jasmine.createSpyObj('Router', ['navigate']);
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [WinnerDialogComponent],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
                { provide: Router, useValue: router },
                { provide: MatDialogRef, useValue: mockDialogRef },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(WinnerDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it("should display the winner's username", () => {
        const messageElement: HTMLElement = fixture.nativeElement.querySelector('p');
        expect(messageElement.textContent).toContain('Le joueur player a gagné la partie !');
    });

    it('should close the dialog and navigate to /end', () => {
        component.goToStats();

        expect(mockDialogRef.close).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/end']);
    });
});
