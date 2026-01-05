import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ROLL_DICE_DELAY } from '@app/constants';
import { DiceComponent } from './dice.component';

describe('DiceComponent', () => {
    let component: DiceComponent;
    let fixture: ComponentFixture<DiceComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DiceComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DiceComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
        expect(component.value).toBe(1);
        expect(component.isRolling).toBe(false);
    });

    it('should set isRolling to true and then reset to false after delay', fakeAsync(() => {
        component.rollDice();
        expect(component.isRolling).toBeTrue();
        tick(ROLL_DICE_DELAY);

        expect(component.isRolling).toBeFalse();
    }));

    it('should not roll again if already rolling', fakeAsync(() => {
        component.isRolling = true;
        component.rollDice();
        expect(component.isRolling).toBeTrue();
    }));
});
