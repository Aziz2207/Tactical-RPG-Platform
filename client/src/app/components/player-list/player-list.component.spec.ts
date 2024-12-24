import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { Attributes } from '@common/interfaces/attributes';
import { Player } from '@common/interfaces/player';
import { PlayerListComponent } from './player-list.component';

describe('PlayerListComponent', () => {
    let component: PlayerListComponent;
    let fixture: ComponentFixture<PlayerListComponent>;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;

    beforeEach(async () => {
        // Création du mock pour RoomManagerService
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['removePlayer']);

        await TestBed.configureTestingModule({
            imports: [PlayerListComponent],
            providers: [provideHttpClientTesting(), { provide: RoomManagerService, useValue: mockRoomManagerService }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display "Hôte" for the host player and "Invité" for non-hosts', () => {
        component.players = [
            {
                userName: 'Lyna',
                attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as unknown as Attributes,
                characterType: 'aero',
                isHost: true,
                socketId: '',
                nbWins: 0,
                hasActed: false,
            } as unknown as Player,
            {
                userName: 'Delany',
                attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as unknown as Attributes,
                characterType: 'elec',
                isHost: false,
                socketId: '',
                nbWins: 0,
                hasActed: false,
            } as unknown as Player,
        ];
        fixture.detectChanges();

        const playerLabels = fixture.debugElement.queryAll(By.css('.player-label span'));
        expect(playerLabels[0].nativeElement.textContent).toContain('Hôte');
        expect(playerLabels[1].nativeElement.textContent).toContain('Invité');
    });

    it('should apply the "host-player" class to the host', () => {
        component.players = [
            {
                userName: 'Lyna',
                attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as unknown as Attributes,
                characterType: 'aero',
                isHost: true,
                socketId: '',
                nbWins: 0,
                hasActed: false,
            } as unknown as Player,
            {
                userName: 'Delany',
                attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as unknown as Attributes,
                characterType: 'elec',
                isHost: false,
                socketId: '',
                nbWins: 0,
                hasActed: false,
            } as unknown as Player,
        ];
        fixture.detectChanges();

        const hostPlayerElement = fixture.debugElement.query(By.css('.host-player'));
        expect(hostPlayerElement).toBeTruthy();
    });

    it('should call removePlayer when the remove button is clicked', () => {
        // Simuler les joueurs
        component.players = [
            {
                userName: 'Lyna',
                attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as unknown as Attributes,
                characterType: 'aero',
                isHost: true,
                socketId: 'host-socket-id',
                nbWins: 0,
                hasActed: false,
            } as unknown as Player,
            {
                userName: 'Delany',
                attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as unknown as Attributes,
                characterType: 'elec',
                isHost: false,
                socketId: 'player-socket-id',
                nbWins: 0,
                hasActed: false,
            } as unknown as Player,
        ];
        component.isCurrentUserHost = true; // Simuler que l'utilisateur actuel est l'hôte
        fixture.detectChanges();

        // Trouver le bouton "Supprimer" correspondant au deuxième joueur
        const removeButton = fixture.debugElement.query(By.css('.remove-player-btn'));
        expect(removeButton).toBeTruthy();

        // Simuler le clic sur le bouton
        removeButton.triggerEventHandler('click', null);

        // Vérifier que la méthode removePlayer a été appelée avec le bon socketId
        expect(mockRoomManagerService.removePlayer).toHaveBeenCalledWith('player-socket-id');
    });
});
