import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombatStatsBarComponent } from './combat-stats-bar.component';

describe('CombatStatsBarComponent', () => {
    let component: CombatStatsBarComponent;
    let fixture: ComponentFixture<CombatStatsBarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CombatStatsBarComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CombatStatsBarComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
