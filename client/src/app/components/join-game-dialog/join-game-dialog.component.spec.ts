import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { JoinGameDialogComponent } from './join-game-dialog.component';

describe('JoinGameDialogComponent', () => {
    let component: JoinGameDialogComponent;
    let fixture: ComponentFixture<JoinGameDialogComponent>;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<JoinGameDialogComponent>>;

    const mockRoom = { code: '1234', players: [], isLocked: false, maxPlayers: 4, takenCharacters: [], isActive: false };

    beforeEach(async () => {
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['joinRoom']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [JoinGameDialogComponent, ReactiveFormsModule],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: RoomManagerService, useValue: mockRoomManagerService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(JoinGameDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close the dialog when onNoClick is called', () => {
        component.onNoClick();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should show error message', () => {
        component.joinForm.controls['code'].setValue('12345');
        component.onNextClick();
        expect(component.errorMessage).toBe('Le code est invalide');
    });

    it('should call joinRoom and navigate to /characters', async () => {
        component.joinForm.controls['code'].setValue('1234');
        mockRoomManagerService.joinRoom.and.returnValue(Promise.resolve(mockRoom));
        await component.onNextClick();
        expect(mockRoomManagerService.joinRoom).toHaveBeenCalledWith('1234');
        expect(mockDialogRef.close).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/characters']);
    });

    it('should set errorMessage', async () => {
        component.joinForm.controls['code'].setValue('1234');
        const errorMessage = '';
        mockRoomManagerService.joinRoom.and.returnValue(Promise.reject(errorMessage));
        await component.onNextClick();
        expect(mockRoomManagerService.joinRoom).toHaveBeenCalledWith('1234');
        expect(component.errorMessage).toBe(errorMessage);
    });

    it('should render the template correctly', () => {
        const title = fixture.debugElement.query(By.css('p')).nativeElement;
        expect(title.textContent).toContain("Entrez un code d'acces");

        const input = fixture.debugElement.query(By.css('input')).nativeElement;
        input.value = '1234';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(component.joinForm.controls['code'].value).toBe('1234');

        component.errorMessage = 'Le code est invalide';
        fixture.detectChanges();
        const errorMessage = fixture.debugElement.query(By.css('.cant-join-message')).nativeElement;
        expect(errorMessage.textContent).toContain('Le code est invalide');
        const joinButton = fixture.debugElement.query(By.css('.right-button'));
        spyOn(component, 'onNextClick');
        joinButton.triggerEventHandler('click', null);
        expect(component.onNextClick).toHaveBeenCalled();
    });
});
