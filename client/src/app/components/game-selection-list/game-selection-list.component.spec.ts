import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartGameService } from '@app/services/start-game/start-game.service';
import { Game } from '@common/interfaces/game';
import { ModeEnum } from '@common/mode-enum';
import { Subject } from 'rxjs';
import { GameSelectionListComponent } from './game-selection-list.component';

describe('GameSelectionListComponent', () => {
    let component: GameSelectionListComponent;
    let fixture: ComponentFixture<GameSelectionListComponent>;
    let mockStartGameService: jasmine.SpyObj<StartGameService>;
    let stateListSubject: Subject<{ title: string; _id: string; isVisible: boolean }[]>;
    let stateSelectionSubject: Subject<Game | undefined>;

    const mockGameList = [
        { title: 'Game 1', _id: '1', isVisible: true },
        { title: 'Game 2', _id: '2', isVisible: true },
    ];
    const mockSelectedGame: Game = {
        title: 'Game 1',
        map: {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.CTF,
        },
        lastMod: '2021-10-10',
        size: 10,
        description: 'Game 1',
        isVisible: true,
        prevImg: 'img',
        _id: '1',
    };

    beforeEach(async () => {
        stateListSubject = new Subject();
        stateSelectionSubject = new Subject();

        mockStartGameService = jasmine.createSpyObj('StartGameService', ['selectGame', 'reset']);
        mockStartGameService.stateList$ = stateListSubject.asObservable();
        mockStartGameService.stateSelection$ = stateSelectionSubject.asObservable();

        await TestBed.configureTestingModule({
            providers: [{ provide: StartGameService, useValue: mockStartGameService }],
            imports: [GameSelectionListComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameSelectionListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize gameList and selectedGame', () => {
        stateListSubject.next(mockGameList);
        stateSelectionSubject.next(mockSelectedGame);
        fixture.detectChanges();
        expect(component.gameList).toEqual(mockGameList);
        expect(component.selectedGame).toEqual(mockSelectedGame);
    });

    it('should call selectGame', () => {
        const gameId = '1';
        component.selectGame(gameId);
        expect(mockStartGameService.selectGame).toHaveBeenCalledWith(gameId);
    });

    it('should update the game list when the stateList$ changes', () => {
        const newGameList = [{ title: 'Game 3', _id: '3', isVisible: true }];
        stateListSubject.next(newGameList);
        fixture.detectChanges();
        expect(component.gameList).toEqual(newGameList);
    });

    it('should update the selected game when the stateSelection$ changes', () => {
        const newSelectedGame: Game = {
            title: 'Game 2',
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.CTF,
            },
            lastMod: 'test',
            size: 10,
            description: 'Game 2',
            isVisible: true,
            prevImg: 'img',
            _id: '2',
        };
        stateSelectionSubject.next(newSelectedGame);
        fixture.detectChanges();
        expect(component.selectedGame).toEqual(newSelectedGame);
    });
});
