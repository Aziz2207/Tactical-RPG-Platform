import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { SimpleDialogComponent } from '@app/components/simple-dialog/simple-dialog.component';
import { mockLobbyPlayers } from '@app/mocks/mock-lobby-players';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Player, Status } from '@common/interfaces/player';
import { of } from 'rxjs';
import { LobbyPlayerComponent } from './lobby-player.component';

describe('LobbyPlayerComponent', () => {
    let component: LobbyPlayerComponent;
    let fixture: ComponentFixture<LobbyPlayerComponent>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;

    const mockLobbyPlayer: Player = mockLobbyPlayers[0];

    beforeEach(async () => {
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['send']);

        await TestBed.configureTestingModule({
            imports: [LobbyPlayerComponent],
            providers: [
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LobbyPlayerComponent);
        component = fixture.componentInstance;
        component.lobbyPlayer = mockLobbyPlayer;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should open dialog on kickPlayer', () => {
        const dialogRefSpy = jasmine.createSpyObj('DialogRef', ['afterClosed']);
        dialogRefSpy.afterClosed.and.returnValue(of({ action: 'right' }));
        dialogSpy.open.and.returnValue(dialogRefSpy);
        component.lobbyPlayer.status = Status.Player;
        component.kickOutPlayer();

        expect(dialogSpy.open).toHaveBeenCalledWith(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: 'Exclure un joueur',
                messages: ['Êtes-vous certain de vouloir exclure le joueur?'],
                options: ['Annuler', 'Exclure'],
                confirm: true,
            },
        });
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('kickPlayer', component.lobbyPlayer.id);
    });

    it('should send kickBot is bot is kicked', () => {
        const dialogRefSpy = jasmine.createSpyObj('DialogRef', ['afterClosed']);
        dialogRefSpy.afterClosed.and.returnValue(of({ action: 'right' }));
        dialogSpy.open.and.returnValue(dialogRefSpy);
        component.lobbyPlayer.status = Status.Bot;
        component.kickOutPlayer();

        expect(dialogSpy.open).toHaveBeenCalledWith(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: 'Exclure un joueur',
                messages: ['Êtes-vous certain de vouloir exclure le joueur?'],
                options: ['Annuler', 'Exclure'],
                confirm: true,
            },
        });
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith('kickBot', component.lobbyPlayer.id);
    });
});
