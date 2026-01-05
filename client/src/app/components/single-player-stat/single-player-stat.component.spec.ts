import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SinglePlayerStatComponent } from './single-player-stat.component';
import { PostGameService } from '@app/services/post-game/post-game.service';
import { Player, PostGameStats } from '@common/interfaces/player';
import { PlayerStatType } from '@common/interfaces/post-game-stat';
import { TOTAL_PERCENTAGE } from '@app/constants';

describe('SinglePlayerStatComponent', () => {
    let component: SinglePlayerStatComponent;
    let fixture: ComponentFixture<SinglePlayerStatComponent>;
    let mockPostGameService: jasmine.SpyObj<PostGameService>;

    beforeEach(async () => {
        mockPostGameService = jasmine.createSpyObj('PostGameService', ['getMaxStat']);
        mockPostGameService.getMaxStat.and.returnValue(TOTAL_PERCENTAGE);

        await TestBed.configureTestingModule({
            imports: [SinglePlayerStatComponent],
            providers: [{ provide: PostGameService, useValue: mockPostGameService }],
        }).compileComponents();

        fixture = TestBed.createComponent(SinglePlayerStatComponent);
        component = fixture.componentInstance;
    });

    describe('getStatValue', () => {
        it('should return the stat value of the player for the given attribute', () => {
            component.player = {
                postGameStats: {
                    damageDealt: 1,
                } as unknown as PostGameStats,
            } as Player;
            component.attribute = 'damageDealt';
            const result = component.getStatValue();
            expect(result).toBe(1);
        });
    });

    describe('formatStatValue', () => {
        it('should append "%" to the value if the attribute is TilesVisited', () => {
            component.player = {
                postGameStats: {
                    tilesVisited: 1,
                } as unknown as PostGameStats,
            } as Player;
            component.attribute = PlayerStatType.TilesVisited;
            const result = component.formatStatValue();
            expect(result).toBe('1%');
        });

        it('should return the value as a string for other attributes', () => {
            component.player = {
                postGameStats: {
                    damageDealt: 1,
                } as unknown as PostGameStats,
            } as Player;
            component.attribute = 'damageDealt';
            const result = component.formatStatValue();
            expect(result).toBe('1');
        });
    });

    describe('getBarWidth', () => {
        it('should calculate the correct bar width for percentage-based attributes', () => {
            component.attribute = PlayerStatType.TilesVisited;
            const attribute = 1;
            const statKey = 'tilesVisited' as keyof Player['postGameStats'];
            const isPercent = true;
            const result = component.getBarWidth(attribute, statKey, isPercent);

            expect(result).toBe(1);
        });

        it('should calculate the correct bar width for non-percentage attributes', () => {
            component.attribute = 'damageDealt';
            const attribute = 1;
            const statKey = 'damageDealt' as keyof Player['postGameStats'];
            const isPercent = false;

            const result = component.getBarWidth(attribute, statKey, isPercent);
            expect(result).toBe(1);
        });

        it('should cap the bar width at TOTAL_PERCENTAGE', () => {
            component.attribute = 'damageDealt';
            const attribute = TOTAL_PERCENTAGE + 1;
            const statKey = 'damageDealt' as keyof Player['postGameStats'];
            const isPercent = false;
            const result = component.getBarWidth(attribute, statKey, isPercent);
            expect(result).toBe(TOTAL_PERCENTAGE);
        });
    });

    describe('hasBar', () => {
        it('should return true for attributes with a bar', () => {
            component.attribute = PlayerStatType.DamageDealt;
            const result = component.hasBar();
            expect(result).toBe(true);
        });

        it('should return false for attributes without a bar', () => {
            component.attribute = 'someOtherAttribute';
            const result = component.hasBar();
            expect(result).toBe(false);
        });
    });

    describe('isPercent', () => {
        it('should return true if the attribute is TilesVisited', () => {
            component.attribute = PlayerStatType.TilesVisited;
            const result = component.isPercent();
            expect(result).toBe(true);
        });

        it('should return false for non-percentage attributes', () => {
            component.attribute = 'damageDealt';
            const result = component.isPercent();
            expect(result).toBe(false);
        });
    });

    describe('getAttrKey', () => {
        it('should return the attribute as a key of Player postGameStats', () => {
            component.attribute = 'damageDealt';
            const result = component.getAttrKey();
            expect(result).toBe('damageDealt' as keyof Player['postGameStats']);
        });

        it('should work with other attributes from Player postGameStats', () => {
            component.attribute = 'tilesVisited';
            const result = component.getAttrKey();
            expect(result).toBe('tilesVisited' as keyof Player['postGameStats']);
        });
    });

    describe('getAttribute', () => {
        it('should return the attribute as a key of PostGameStats', () => {
            component.attribute = 'tilesVisited';
            const result = component.getAttribute();
            expect(result).toBe('tilesVisited' as keyof PostGameStats);
        });

        it('should work with other attributes from PostGameStats', () => {
            component.attribute = 'damageDealt';
            const result = component.getAttribute();
            expect(result).toBe('damageDealt' as keyof PostGameStats);
        });
    });
});
