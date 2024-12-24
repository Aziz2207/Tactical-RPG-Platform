import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONSTANTS } from '@common/constants';
import { TurnDialogComponent } from './turn-dialog.component';

describe('TurnDialogComponent', () => {
    let component: TurnDialogComponent;
    let fixture: ComponentFixture<TurnDialogComponent>;

    const mockDialogData = {
        playerName: 'TestPlayer',
        type: 'warrior',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TurnDialogComponent],
            providers: [{ provide: MAT_DIALOG_DATA, useValue: mockDialogData }],
        }).compileComponents();

        fixture = TestBed.createComponent(TurnDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it("should display the player's name in the dialog message", () => {
        const messageElement: HTMLElement = fixture.nativeElement.querySelector('.game-dialog');
        expect(messageElement.textContent).toContain("C'est le tour de TestPlayer");
    });

    it('should update progress and color over time', fakeAsync(() => {
        const duration = CONSTANTS.END_TURN_DELAY;
        const step = CONSTANTS.PROGRESS_PERCENTAGE;
        const decrement = CONSTANTS.PROGRESS_PERCENTAGE / (duration / step);

        component.ngOnInit();
        expect(component.progress).toBe(CONSTANTS.PROGRESS_PERCENTAGE);

        tick(step);
        expect(component.progress).toBeCloseTo(CONSTANTS.PROGRESS_PERCENTAGE - decrement, 1);

        tick(duration - step);
        expect(component.progress).toBe(0);
        expect(component.progressColor).toBe('red');
        component.ngOnDestroy();
    }));

    it('should clear the interval on destroy', () => {
        spyOn(window, 'clearInterval');
        component.ngOnDestroy();
        expect(window.clearInterval).toHaveBeenCalledWith(component.intervalId);
    });

    describe('getProgressColor', () => {
        it('should return green for high progress', () => {
            expect(component.getProgressColor(CONSTANTS.PROGRESS_BAR_MEDIUM + 1)).toBe('green');
        });

        it('should return yellow for medium progress', () => {
            expect(component.getProgressColor(CONSTANTS.PROGRESS_BAR_LOW + 1)).toBe('yellow');
        });

        it('should return red for low progress', () => {
            expect(component.getProgressColor(CONSTANTS.PROGRESS_BAR_LOW)).toBe('red');
        });
    });
});
