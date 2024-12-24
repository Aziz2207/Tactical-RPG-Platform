/* import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { CombatComponent } from '@app/components/combat/combat.component';
import { GameBoxComponent } from '@app/components/game-box/game-box.component';
import { GameComponent } from '@app/components/game/game.component';
import { PlayerListGameComponent } from '@app/components/player-list-game/player-list-game.component';
import { CombatService } from '@app/services/combat.service';
import { GameService, GameState } from '@app/services/game.service';
import { CONSTANTS } from '@common/constants';
import { Attributes } from '@common/Interfaces/Attributes';
import { GamePageComponent } from './game-page.component';

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockCombatService: jasmine.SpyObj<CombatService>;
    let mockRouter: jasmine.SpyObj<Router>;
    // const createMockPlayers = (): Player[] => [
    //     {
    //         userName: 'Lyna',
    //         attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as Attributes,
    //         characterType: 'aero',
    //         isHost: true,
    //         socketId: '',
    //         nbWins: 0,
    //         hasActed: false,
    //     },
    //     {
    //         userName: 'Delany',
    //         attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as Attributes,
    //         characterType: 'elec',
    //         isHost: false,
    //         socketId: '',
    //         nbWins: 0,
    //         hasActed: false,
    //     },
    // ];

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['loadGame', 'passTurn', 'quitGame', 'getSize']);
        mockCombatService = jasmine.createSpyObj('CombatService', ['enableListners', 'reset']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [GamePageComponent, MatIconModule, GameComponent, GameBoxComponent, ChatComponent, CombatComponent, PlayerListGameComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: CombatService, useValue: mockCombatService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should load game and set up game state when map exists', () => {
            const mockPlayers = [
                {
                    userName: 'Lyna',
                    attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as Attributes,
                    characterType: 'aero',
                    isHost: true,
                    socketId: '',
                    nbWins: 0,
                    hasActed: false,
                },
                {
                    userName: 'Delany',
                    attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as Attributes,
                    characterType: 'elec',
                    isHost: false,
                    socketId: '',
                    nbWins: 0,
                    hasActed: false,
                },
            ];
            const mockGameState: GameState = {
                map: { _size: 10 },
                players: mockPlayers,
            } as GameState;
            mockGameService.gameState = mockGameState;

            component.ngOnInit();

            expect(mockGameService.loadGame).toHaveBeenCalled();
            expect(component.gameState).toBe(mockGameState);
            expect(component.nbPlayers).toBe(2);
            expect(component.size).toBe(CONSTANTS.SIZE_10);
            expect(mockCombatService.enableListners).toHaveBeenCalled();
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });

        it('should navigate to home when map does not exist', () => {
            component.ngOnInit();

            expect(mockGameService.loadGame).toHaveBeenCalled();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
        });
    });

    it('should reset combat service on ngOnDestroy', () => {
        component.ngOnDestroy();
        expect(mockCombatService.reset).toHaveBeenCalled();
    });

    it('should call passTurn on gameService when passTurn is called', () => {
        component.passTurn();
        expect(mockGameService.passTurn).toHaveBeenCalled();
    });

    it('should quit game and navigate to home when quitGame is called', () => {
        component.quitGame();
        expect(mockGameService.quitGame).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
}); */
