import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CONSTANTS } from '@common/constants';
import { DiceComponent } from './dice.component';

describe('DiceComponent', () => {
    let component: DiceComponent;
    let fixture: ComponentFixture<DiceComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DiceComponent], // Import the standalone component
        }).compileComponents();

        fixture = TestBed.createComponent(DiceComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set the currentRollClass to "rolling" when roleResult is provided', () => {
        component.roleResult = 3;
        component.ngOnChanges(); // Trigger lifecycle hook

        expect(component.currentRollClass).toBe('rolling');
    });

    it('should change the class after the timeout', (done) => {
        component.roleResult = 5;
        component.ngOnChanges(); // Trigger lifecycle hook

        setTimeout(() => {
            expect(component.currentRollClass).toBe('roll-5');
            done();
        }, CONSTANTS.MS_TO_SECONDS_CONVERSION + 50);
    });
});
