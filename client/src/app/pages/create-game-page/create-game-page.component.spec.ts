import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { GameListComponent } from '@app/components/game-list/game-list.component';
import { MESSAGE_DURATION_CHARACTER_FORM } from '@app/constants';
import { mockGames } from '@app/mocks/mock-game';
import { mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { mockRoom } from '@app/mocks/mock-room';
import { GameListService } from '@app/services/game-list/game-list.service';
import { GameService } from '@app/services/sockets/game/game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Game } from '@common/interfaces/game';
import { PathRoute } from '@common/interfaces/route';
import { BehaviorSubject, of } from 'rxjs';
import { CreateGamePageComponent } from './create-game-page.component';

describe('CreateGamePageComponent', () => {
    let component: CreateGamePageComponent;
    let fixture: ComponentFixture<CreateGamePageComponent>;
    let gameListServiceSpy: jasmine.SpyObj<GameListService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
    let selectedGameSubject: BehaviorSubject<Game | null>;
    let chosenGameSubject: BehaviorSubject<Game | null>;
    let mockMap: Game;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        mockMap = mockGames[0];
        gameListServiceSpy = jasmine.createSpyObj('GameListService', [
            'getAllVisibleGames',
            'selectGame',
            'deselectGame',
            'getGames',
            'checkIfVisibleGameExists',
        ]);
        selectedGameSubject = new BehaviorSubject<Game | null>(null);
        chosenGameSubject = new BehaviorSubject<Game | null>(null);
        Object.defineProperty(gameListServiceSpy, 'selectedGameSubject', { value: selectedGameSubject });
        Object.defineProperty(gameListServiceSpy, 'chosenGameSubject', { value: chosenGameSubject });

        gameListServiceSpy.getAllVisibleGames.and.returnValue(of(mockGames));
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['connect', 'send', 'on', 'isSocketAlive', 'disconnect']);
        gameServiceSpy = jasmine.createSpyObj('GameService', ['setRoomId', 'joinRoom']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        gameListServiceSpy.selectGame.and.callFake((game: Game) => {
            game.isSelected = true;
        });
        gameListServiceSpy.deselectGame.and.callFake((games: Game[]) => {
            games.forEach((game) => (game.isSelected = false));
        });
        gameListServiceSpy.getGames.and.returnValue(of(mockGames));

        await TestBed.configureTestingModule({
            imports: [CreateGamePageComponent, GameListComponent],
            providers: [
                { provide: GameListService, useValue: gameListServiceSpy },
                { provide: ActivatedRoute, useValue: activatedRouteSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateGamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        gameListServiceSpy.selectedGameSubject.next(null);
        gameListServiceSpy.chosenGameSubject.next(null);
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should set isCharacterFormVisible to true when showCharacterForm is called and the visible game exist', () => {
        gameListServiceSpy.selectedGameSubject.next(mockMap);
        gameListServiceSpy.chosenGameSubject.next(mockMap);
        gameListServiceSpy.checkIfVisibleGameExists.and.returnValue(of(mockMap));

        component.showCharacterForm();

        expect(component.isCharacterFormVisible).toBeTrue();
        expect(snackBarSpy.open).not.toHaveBeenCalled();
    });

    it('should show snack bar if no game is selected', () => {
        component.showCharacterForm();

        expect(snackBarSpy.open).toHaveBeenCalledWith('Veuillez sélectionner un jeu avant de créer la partie', 'Fermer', {
            duration: MESSAGE_DURATION_CHARACTER_FORM,
        });
        expect(component.isCharacterFormVisible).toBeFalse();
    });

    it('should set isCharacterFormVisible to false when hideCharacterForm is called', () => {
        component.hideCharacterForm();
        expect(component.isCharacterFormVisible).toBeFalse();
        expect(socketCommunicationServiceSpy.disconnect).toHaveBeenCalled();
    });

    it('should show snack bar if selected game does not exist', () => {
        selectedGameSubject.next(mockMap);

        gameListServiceSpy.checkIfVisibleGameExists.and.returnValue(of(null));

        component.showCharacterForm();

        expect(snackBarSpy.open).toHaveBeenCalledWith("Le jeu sélectionné n'existe pas ou a été caché", 'Fermer', {
            duration: MESSAGE_DURATION_CHARACTER_FORM,
        });
        expect(component.isCharacterFormVisible).toBeFalse();
    });

    it('should create a room and navigate to waiting-page', () => {
        const roomInfo = mockRoom;
        socketCommunicationServiceSpy.on.and.callFake(<Room>(event: string, callback: (data: Room) => void) => {
            if (event === 'roomCreated') {
                callback(roomInfo as Room);
            }
        });

        component.selectedGame = mockMap;
        component.createRoom();

        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('createRoom', component.selectedGame);
        expect(gameServiceSpy.selectedGame).toBe(roomInfo.gameMap);
        expect(gameServiceSpy.setRoomId).toHaveBeenCalledWith(roomInfo.roomId);
        expect(gameServiceSpy.joinRoom).toHaveBeenCalledWith(roomInfo.roomId);
        expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.Lobby], { queryParams: { roomCode: roomInfo.roomId } });
    });

    it('should call createRoom when joinLobby is called', () => {
        const createRoomSpy = spyOn(component, 'createRoom');
        component.joinLobby(mockLobbyPlayers[0]);
        expect(createRoomSpy).toHaveBeenCalled();
    });
});
