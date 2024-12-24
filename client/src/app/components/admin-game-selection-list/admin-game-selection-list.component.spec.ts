import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminService } from '@app/services/admin/admin.service';
import { Game } from '@common/interfaces/game';
import { ModeEnum } from '@common/mode-enum';
import { Subject } from 'rxjs';
import { AdminGameSelectionListComponent } from './admin-game-selection-list.component';

describe('GameSelectionListComponent', () => {
    let component: AdminGameSelectionListComponent;
    let fixture: ComponentFixture<AdminGameSelectionListComponent>;
    let mockAdminService: jasmine.SpyObj<AdminService>;
    let stateListSubject: Subject<{ title: string; _id: string; isVisible: boolean }[]>;
    let stateSelectionSubject: Subject<Game | undefined>;

    beforeEach(async () => {
        stateListSubject = new Subject();
        stateSelectionSubject = new Subject();

        mockAdminService = jasmine.createSpyObj('AdminService', ['selectGame']);
        mockAdminService.stateList$ = stateListSubject.asObservable();
        mockAdminService.stateSelection$ = stateSelectionSubject.asObservable();

        await TestBed.configureTestingModule({
            imports: [AdminGameSelectionListComponent],
            providers: [{ provide: AdminService, useValue: mockAdminService }],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminGameSelectionListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have gameList and selectedGame as undefined', () => {
        expect(component.gameList).toBeUndefined();
        expect(component.selectedGame).toBeUndefined();
    });

    it('should update gameList when stateList$ emits', () => {
        const games = [{ title: 'game1', _id: '1', isVisible: true }];
        stateListSubject.next(games);
        fixture.detectChanges();
        expect(component.gameList).toEqual(games);
    });

    it('should update selectedGame when stateSelection$ emits', () => {
        const game: Game = { title: 'game1', map: { _tiles: [], _size: 1, mode: ModeEnum.CTF, _items: [] }, size: 1 };
        stateSelectionSubject.next(game);
        fixture.detectChanges();
        expect(component.selectedGame).toEqual(game);
    });

    it('should call selectGame with correct id when selectGame is called', () => {
        const id = '1';
        component.selectGame(id);
        expect(mockAdminService.selectGame).toHaveBeenCalledWith(id);
    });
});
