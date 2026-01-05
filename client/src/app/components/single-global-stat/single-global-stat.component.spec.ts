import { TestBed } from '@angular/core/testing';
import { SingleGlobalStatComponent } from './single-global-stat.component';
import { PostGameService } from '@app/services/post-game/post-game.service';
import { GlobalPostGameStat, GlobalStatType } from '@common/interfaces/global-post-game-stats';

describe('SingleGlobalStatComponent - formatStatValue', () => {
    let component: SingleGlobalStatComponent;
    let mockPostGameService: jasmine.SpyObj<PostGameService>;

    beforeEach(() => {
        mockPostGameService = jasmine.createSpyObj('PostGameService', ['globalStats'], {
            doorsInteractedPercentage: '75%',
            globalTilesVisitedPercentage: 60,
            globalStats: {
                [GlobalStatType.GameDuration]: '2h 30m',
                [GlobalStatType.Turns]: 45,
                [GlobalStatType.NbFlagBearers]: 5,
            },
        });

        TestBed.configureTestingModule({
            imports: [SingleGlobalStatComponent],
            providers: [{ provide: PostGameService, useValue: mockPostGameService }],
        });

        const fixture = TestBed.createComponent(SingleGlobalStatComponent);
        component = fixture.componentInstance;
    });

    it('should format value for DoorsInteracted', () => {
        component.globalStat = { key: GlobalStatType.DoorsInteracted } as GlobalPostGameStat;
        const result = component.formatStatValue();
        expect(result).toBe('75%');
    });

    it('should format value for GlobalTilesVisited', () => {
        component.globalStat = { key: GlobalStatType.GlobalTilesVisited } as GlobalPostGameStat;
        const result = component.formatStatValue();
        expect(result).toBe('60%');
    });

    it('should format value for other stat keys', () => {
        component.globalStat = { key: GlobalStatType.GameDuration } as GlobalPostGameStat;
        const result = component.formatStatValue();
        expect(result).toBe('2h 30m');
    });

    it('should format value for other stat keys', () => {
        component.globalStat = { key: GlobalStatType.Turns } as GlobalPostGameStat;
        const result = component.formatStatValue();
        expect(result).toBe('45');
    });
});
