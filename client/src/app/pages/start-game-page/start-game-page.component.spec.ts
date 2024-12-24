import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StartGameService } from '@app/services/start-game/start-game.service';
import { of } from 'rxjs';
import { StartGamePageComponent } from './start-game-page.component';

describe('StartGamePageComponent', () => {
    let component: StartGamePageComponent;
    let fixture: ComponentFixture<StartGamePageComponent>;
    let mockStartGameService;
    let mockHttp;

    beforeEach(async () => {
        mockStartGameService = jasmine.createSpyObj('StartGameService', ['getGames', 'reset', 'selectGame']);
        mockStartGameService.getGames.and.returnValue(of([]));
        mockStartGameService.stateList$ = of([]);
        mockStartGameService.stateSelection$ = of(undefined);
        mockHttp = jasmine.createSpyObj('HttpClient', ['get']);

        // TestBed.overrideProvider(StartGameService, { useValue: mockStartGameService });

        await TestBed.configureTestingModule({
            providers: [
                {
                    provide: HttpClient,
                    useValue: mockHttp,
                },
                {
                    provide: StartGameService,
                    useValue: mockStartGameService,
                },
                provideRouter([]),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(StartGamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
