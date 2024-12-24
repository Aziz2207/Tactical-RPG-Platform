import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameItemComponent } from './game-item.component';

describe('GameItemComponent', () => {
    let component: GameItemComponent;
    let fixture: ComponentFixture<GameItemComponent>;
    const fakeGame1 = { title: 'abcdef', _id: 'boo', isVisible: false };
    const isSelected = false;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameItemComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameItemComponent);

        component = fixture.componentInstance;
        component.game = fakeGame1;
        component.selected = isSelected;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
