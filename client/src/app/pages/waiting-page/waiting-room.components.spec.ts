import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { InfoDialogComponent } from '@app/components/info-dialog/info-dialog.component';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { Subject } from 'rxjs';
import { WaitingRoomComponent } from './waiting-room.component';
describe('WaitingRoomComponent', () => {
    let component: WaitingRoomComponent;
    let fixture: ComponentFixture<WaitingRoomComponent>;

    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockMatDialog: jasmine.SpyObj<MatDialog>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<InfoDialogComponent>>;
    let mockActivatedRoute: unknown;

    let mockRoom: Room;
    let mockPlayer: Player;
    let routerEventsSubject: Subject<unknown>;

    beforeEach(() => {
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['getRoom', 'leaveRoom', 'toogleRoomLock'], ['player']);
        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'off', 'send']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate'], ['events']);
        mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed', 'close']);

        mockMatDialog.open.and.returnValue(mockDialogRef);

        mockActivatedRoute = {
            snapshot: {
                paramMap: {
                    get: () => 'mockValue',
                },
            },
        };

        mockRoom = {
            code: '1234',
            players: [],
            map: undefined,
            takenCharacters: [],
            isLocked: false,
            maxPlayers: 4,
            isActive: false,
        };

        mockPlayer = {
            userName: 'TestPlayer',
            attributes: {
                speedPoints: 0,
                currentSpeed: 0,
                lifePoints: 0,
                currentHP: 0,
                offensePoints: 0,
                defensePoints: 0,
                diceChoice: 'attack',
                actionLeft: 0,
            },
            characterType: 'TestCharacter',
            isHost: true,
            socketId: 'socket123',
            nbWins: 0,
            hasActed: false,
        } as unknown as Player;

        routerEventsSubject = new Subject<unknown>();
        Object.defineProperty(mockRouter, 'events', { get: () => routerEventsSubject.asObservable() });

        Object.defineProperty(mockRoomManagerService, 'player', { get: () => mockPlayer });

        TestBed.configureTestingModule({
            imports: [MatDialogModule, WaitingRoomComponent, InfoDialogComponent],
            providers: [
                { provide: RoomManagerService, useValue: mockRoomManagerService },
                { provide: SocketService, useValue: mockSocketService },
                { provide: Router, useValue: mockRouter },
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitingRoomComponent);
        component = fixture.componentInstance;
    });

    it('should initialize component when room exists', () => {
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);
        mockRoom.players = [mockPlayer];
        mockPlayer.isHost = true;

        spyOn(window, 'addEventListener');

        component.ngOnInit();

        expect(component.room).toBe(mockRoom);
        expect(component.accessCode).toBe(mockRoom.code);
        expect(component.players).toBe(mockRoom.players);
        expect(component.isCurrentUserHost).toBeTrue();
        expect(mockSocketService.on).toHaveBeenCalledWith('hostLeft', jasmine.any(Function));
        expect(mockSocketService.on).toHaveBeenCalledWith('removedFromRoom', jasmine.any(Function));
        expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', component.handleUnload);
    });

    it('should call handleUnload when navigating away from waiting room', () => {
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);
        spyOn(component, 'handleUnload');

        component.ngOnInit();
        routerEventsSubject.next(new NavigationStart(1, '/home'));
        expect(component.handleUnload).toHaveBeenCalled();
    });

    it('should not call handleUnload when navigating to /game', () => {
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);
        spyOn(component, 'handleUnload');

        component.ngOnInit();

        routerEventsSubject.next(new NavigationStart(1, '/game'));

        expect(component.handleUnload).not.toHaveBeenCalled();
    });

    it('should navigate to /home when room does not exist', () => {
        mockRoomManagerService.getRoom.and.returnValue(undefined);

        component.ngOnInit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should clean up on ngOnDestroy', () => {
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);
        component.ngOnInit();

        spyOn(window, 'removeEventListener');
        spyOn(component['navigationSubscription'], 'unsubscribe');

        component.ngOnDestroy();

        expect(window.removeEventListener).toHaveBeenCalledWith('beforeunload', component.handleUnload);
        expect(mockSocketService.off).toHaveBeenCalledWith('hostLeft', jasmine.any(Function));
        expect(mockSocketService.off).toHaveBeenCalledWith('removedFromRoom', jasmine.any(Function));
        expect(component['navigationSubscription'].unsubscribe).toHaveBeenCalled();
    });

    it('should call roomManagerService.leaveRoom on handleUnload', () => {
        component.handleUnload();
        expect(mockRoomManagerService.leaveRoom).toHaveBeenCalled();
    });

    it('should return true when room is full', () => {
        component.room = {
            code: '1234',
            players: [],
            map: undefined,
            takenCharacters: ['char1', 'char2', 'char3', 'char4'],
            isLocked: false,
            maxPlayers: 4,
            isActive: false,
        };

        const result = component.isRoomFull();

        expect(result).toBeTrue();
    });

    it('should return false when room is not full', () => {
        component.room = {
            code: '1234',
            players: [],
            map: undefined,
            takenCharacters: ['char1', 'char2'],
            isLocked: false,
            maxPlayers: 4,
            isActive: false,
        };

        const result = component.isRoomFull();
        expect(result).toBeFalse();
    });
    // it('should navigate to /home and call roomManagerService.leaveRoom on quitGame', () => {
    //     const dialogRefSpy = jasmine.createSpyObj({ afterClosed: of('yes') });
    //     mockMatDialog.open.and.returnValue(dialogRefSpy);

    //     component.quitGame();

    //     expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    //     expect(mockRoomManagerService.leaveRoom).toHaveBeenCalled();
    // });

    it('should send initialiseGame event with room code on startGame', () => {
        component.room = mockRoom;
        component.startGame();
        expect(mockSocketService.send).toHaveBeenCalledWith('initialiseGame', mockRoom.code);
    });

    it('should not open dialog again if dialogRef is already defined for hostLeft', () => {
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);
        mockMatDialog.open.and.returnValue(mockDialogRef);

        component.ngOnInit();

        component['dialogRef'] = mockDialogRef;
        const hostLeftCallback = mockSocketService.on.calls.argsFor(0)[1];

        hostLeftCallback({});
        expect(mockMatDialog.open).not.toHaveBeenCalled();
    });

    it('should not open dialog again if dialogRef is already defined for removedFromRoom', () => {
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);
        mockMatDialog.open.and.returnValue(mockDialogRef);

        component.ngOnInit();
        component['dialogRef'] = mockDialogRef;

        const removedFromRoomCallback = mockSocketService.on.calls.argsFor(1)[1];
        removedFromRoomCallback({ reason: 'removed' });
        expect(mockMatDialog.open).not.toHaveBeenCalled();
    });

    it('should not call handleUnload when router event is not NavigationStart', () => {
        mockRoomManagerService.getRoom.and.returnValue(mockRoom);
        spyOn(component, 'handleUnload');

        component.ngOnInit();
        routerEventsSubject.next({});
        expect(component.handleUnload).not.toHaveBeenCalled();
    });

    it('should toggle room lock', () => {
        component.toggleRoomLock();
        expect(mockRoomManagerService.toogleRoomLock).toHaveBeenCalled();
    });

    it('should start the game by sending initialiseGame event with room code', () => {
        component.room = mockRoom;
        component.startGame();
        expect(mockSocketService.send).toHaveBeenCalledWith('initialiseGame', mockRoom.code);
    });
});
