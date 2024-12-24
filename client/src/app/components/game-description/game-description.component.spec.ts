import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameService } from '@app/services/game/game.service';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { StartGameService } from '@app/services/start-game/start-game.service';
import { Game } from '@common/interfaces/game';
import { ModeEnum } from '@common/mode-enum';
import { Subject } from 'rxjs';
import { GameDescriptionComponent } from './game-description.component';

describe('GameDescriptionComponent', () => {
    let component: GameDescriptionComponent;
    let fixture: ComponentFixture<GameDescriptionComponent>;
    let mockStartGameService: Partial<StartGameService>;
    let mockGameService;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockStartGameService = {
            stateSelection$: new Subject<Game>(),
        };
        mockGameService = jasmine.createSpyObj('GameService', ['loadGame']);
        TestBed.overrideProvider(GameService, { useValue: mockGameService });

        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['createRoom']);

        await TestBed.configureTestingModule({
            imports: [GameDescriptionComponent],
            providers: [
                { provide: StartGameService, useValue: mockStartGameService },
                { provide: RoomManagerService, useValue: mockRoomManagerService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameDescriptionComponent);
        component = fixture.componentInstance;
    });

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should subscribe to stateSelection$ on ngOnInit', () => {
        const game: Game = {
            title: 'Test',
            map: { _tiles: [], _size: 0, _items: [], mode: ModeEnum.BR },
            size: 10,
        };

        component.ngOnInit();

        (mockStartGameService.stateSelection$ as Subject<Game>).next(game);
        expect(component.currentGame).toEqual(game);
    });

    it('should call loadGame', fakeAsync(() => {
        const mockGame: Game = {
            title: 'Test Game',
            map: { _tiles: [], _size: 0, _items: [], mode: ModeEnum.BR },
            size: 10,
        };
        component.currentGame = mockGame;
        mockRoomManagerService.createRoom.and.returnValue(Promise.resolve());
        component.loadGame();
        tick();
        expect(mockRoomManagerService.createRoom).toHaveBeenCalledWith(mockGame.map);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/characters']);
    }));
});
