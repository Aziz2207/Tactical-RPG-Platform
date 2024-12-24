import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameService } from '@app/services/game/game.service';
import { GlobalStats } from '@common/interfaces/global-stats';
import { PlayerStats } from '@common/interfaces/player-stats';
import { GameEndComponent } from './game-end.component';

describe('GameEndComponent', () => {
    let component: GameEndComponent;
    let fixture: ComponentFixture<GameEndComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const mockPlayerStats: PlayerStats[] = [
        {
            username: 'Player1',
            combats: 5,
            escapes: 2,
            victories: 3,
            defeats: 2,
            healthLost: 50,
            healthInflicted: 100,
            itemsCollected: 5,
            percentageTilesVisited: 60,
            tilesVisited: new Set<string>(),
        },
        {
            username: 'Player2',
            combats: 8,
            escapes: 1,
            victories: 6,
            defeats: 2,
            healthLost: 70,
            healthInflicted: 120,
            itemsCollected: 8,
            percentageTilesVisited: 80,
            tilesVisited: new Set<string>(),
        },
    ];

    const mockGlobalStats: GlobalStats = {
        gameDuration: 600,
        totalTurns: 15,
        percentageTilesVisited: 75,
        percentageDoorsToggled: 40,
        totalFlagHoldersCount: 2,
        tilesVisited: new Set<string>(),
        doorsToggled: new Set<string>(),
        flagHolders: new Set<string>(),
    };

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['leaveEndView', 'quitGame'], {
            gameState: true,
            gameOverStats: {
                playerStats: mockPlayerStats,
                globalStats: mockGlobalStats,
            },
        });
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(GameEndComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize playerStats and globalStats correctly', () => {
        expect(component.playerStats).toEqual(mockPlayerStats);
        expect(component.globalStats).toEqual(mockGlobalStats);
        expect(component.isCTFMode).toBeTrue();
    });

    it('should navigate to home when returnToHome is called', () => {
        component.returnToHome();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should call leaveEndView and quitGame on ngOnDestroy', () => {
        component.ngOnDestroy();
        expect(mockGameService.leaveEndView).toHaveBeenCalled();
        expect(mockGameService.quitGame).toHaveBeenCalled();
    });

    it('should handle empty playerStats gracefully', () => {
        if (mockGameService.gameOverStats) {
            mockGameService.gameOverStats.playerStats = [];
        }
        component.ngOnInit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should toggle sorting direction when the same column is clicked twice', () => {
        component.sortTable('victories');
        const sortedAsc = [...mockPlayerStats].sort((a, b) => a.victories - b.victories);
        expect(component.sortedPlayerStats).toEqual(sortedAsc);

        component.sortTable('victories');
        const sortedDesc = [...mockPlayerStats].sort((a, b) => b.victories - a.victories);
        expect(component.sortedPlayerStats).toEqual(sortedDesc);
    });
});
