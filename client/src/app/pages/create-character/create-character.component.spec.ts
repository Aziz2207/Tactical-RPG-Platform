import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { InfoDialogComponent } from '@app/components/info-dialog/info-dialog.component';
import { CharacterService } from '@app/services/character/character.service';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { of } from 'rxjs';
import { CreateCharacterComponent } from './create-character.component';

describe('CreateCharacterComponent', () => {
    let component: CreateCharacterComponent;
    let fixture: ComponentFixture<CreateCharacterComponent>;
    let mockCharacterService;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;
    let mockCharacter1;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let router: Router;

    beforeEach(async () => {
        mockCharacter1 = { type: 'info', img: '', icn: '', description: 'desc', isTaken: false };
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['sendPlayerInfos', 'getRoom', 'getPlayer', 'leaveRoom'], { room: {} });

        mockCharacterService = jasmine.createSpyObj('CharacterService', ['getCharacters', 'selectCharacter', 'enableListeneners', 'reset']);
        mockCharacterService.getCharacters.and.returnValue(of([]));
        mockCharacterService.state$ = of(mockCharacter1);

        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'off', 'isSocketAlive']);
        mockSocketService.isSocketAlive.and.returnValue(true);

        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            providers: [
                { provide: CharacterService, useValue: mockCharacterService },
                { provide: RoomManagerService, useValue: mockRoomManagerService },
                { provide: SocketService, useValue: mockSocketService },
                { provide: MatDialog, useValue: mockDialog },
                provideRouter([]),
                provideHttpClient(),
                RoomManagerService,
            ],
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');

        fixture = TestBed.createComponent(CreateCharacterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the components', () => {
        const header = fixture.debugElement.query(By.css('app-header'));
        const characterDisplay = fixture.debugElement.query(By.css('app-character-display'));
        const characterCarousel = fixture.debugElement.query(By.css('app-character-caroussel'));
        expect(header).toBeTruthy();
        expect(characterDisplay).toBeTruthy();
        expect(characterCarousel).toBeTruthy();
    });

    it('should unsubscribe from events on destroy', () => {
        component.ngOnDestroy();
        expect(mockSocketService.off).toHaveBeenCalledWith('hostLeft', jasmine.any(Function));
        expect(mockSocketService.off).toHaveBeenCalledWith('removedFromRoom', jasmine.any(Function));
    });

    it('should handle hostLeft event by opening dialog', () => {
        const mockDialogRef = {
            afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
        };
        mockDialog.open.and.returnValue(mockDialogRef as any);

        component['handleHostLeft']();

        expect(mockDialog.open).toHaveBeenCalledWith(InfoDialogComponent, {
            data: { message: "L'hôte a quitté la salle d'attente" },
            width: '375px',
            height: '200px',
            scrollStrategy: component['overlay'].scrollStrategies.noop(),
            panelClass: ['info-dialog-container'],
        });

        expect(component['dialogRefInfo']).toBeTruthy();
    });

    it('should handle removedFromRoom event by opening dialog', () => {
        const mockDialogRef = {
            afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
        };
        mockDialog.open.and.returnValue(mockDialogRef as any);

        component['handleRemovedFromRoom']();

        expect(mockDialog.open).toHaveBeenCalledWith(InfoDialogComponent, {
            data: { message: 'Vous avez été retiré par l’hôte.' },
            width: '375px',
            height: '200px',
            scrollStrategy: component['overlay'].scrollStrategies.noop(),
            panelClass: ['info-dialog-container'],
        });

        expect(component['dialogRefInfo']).toBeTruthy();
    });

    it('should handleUnload by calling leaveRoom and navigating home', () => {
        component['handleUnload']();
        expect(mockRoomManagerService.leaveRoom).not.toHaveBeenCalled();
        expect(component['router'].navigate).toHaveBeenCalledWith(['/home']);
    });
});
