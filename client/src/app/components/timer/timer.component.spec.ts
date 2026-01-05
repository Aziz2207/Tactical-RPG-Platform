import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMBAT_TURN_LENGTH, TIMER_RADIUS } from '@app/constants';
import { TimerComponent } from './timer.component';

describe('TimerComponent', () => {
    let component: TimerComponent;
    let fixture: ComponentFixture<TimerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimerComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimerComponent);
        component = fixture.componentInstance;
        component.totalTime = 10;
        component.timeRemaining = component.totalTime;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
        expect(component.radius).toEqual(TIMER_RADIUS);
        expect(component.circumference).toEqual(2 * Math.PI * TIMER_RADIUS);
    });

    it('should clear interval in ngOnDestroy if intervalId is set', () => {
        const mockFunction = jasmine.createSpy('intervalFunction');
        component.intervalId = setInterval(mockFunction, COMBAT_TURN_LENGTH) as unknown as ReturnType<typeof setInterval>;
        spyOn(window, 'clearInterval');
        component.ngOnDestroy();
        expect(clearInterval).toHaveBeenCalledWith(component.intervalId);
    });

    it('should emit startTimer event in start method', () => {
        spyOn(component.startTimer, 'emit');
        component.start();
        expect(component.startTimer.emit).toHaveBeenCalled();
    });

    it('should calculate and set strokeDashoffset in updateProgress method', () => {
        component.circumference = 100;
        component.timeRemaining = 5;
        component.updateProgress();

        const expectedProgress = (component.timeRemaining / component.totalTime) * component.circumference;
        expect(component.strokeDashoffset).toEqual(component.circumference - expectedProgress);
    });

    it('should set timeRemaining to 0 and emit closeTimer event in timerFinished method', () => {
        spyOn(component.closeTimer, 'emit');
        component.timerFinished();
        expect(component.timeRemaining).toBe(0);
        expect(component.closeTimer.emit).toHaveBeenCalled();
    });
});
