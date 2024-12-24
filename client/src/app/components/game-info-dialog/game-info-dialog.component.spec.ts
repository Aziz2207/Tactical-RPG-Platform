import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GameInfoDialogComponent } from './game-info-dialog.component';

describe('GameInfoDialogComponent', () => {
    let component: GameInfoDialogComponent;
    let fixture: ComponentFixture<GameInfoDialogComponent>;
    let router: jasmine.SpyObj<Router>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<GameInfoDialogComponent>>;

    beforeEach(async () => {
        router = jasmine.createSpyObj('Router', ['navigate']);
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [GameInfoDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: Router, useValue: router },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameInfoDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close the dialog and navigate to home when returnHome is called', () => {
        component.returnHome();

        expect(mockDialogRef.close).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });
});
