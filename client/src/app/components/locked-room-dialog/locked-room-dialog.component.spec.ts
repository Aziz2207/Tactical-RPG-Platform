import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { LockedRoomDialogComponent } from './locked-room-dialog.component';

describe('LockedRoomDialogComponent', () => {
    let component: LockedRoomDialogComponent;
    let fixture: ComponentFixture<LockedRoomDialogComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<LockedRoomDialogComponent>>;
    let mockHttp: jasmine.SpyObj<HttpClient>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockRoomManagerService: jasmine.SpyObj<RoomManagerService>;

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockHttp = jasmine.createSpyObj('HttpClient', ['get']);
        mockRoomManagerService = jasmine.createSpyObj('RoomManagerService', ['leaveRoom']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [LockedRoomDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: HttpClient, useValue: mockHttp },
                { provide: RoomManagerService, useValue: mockRoomManagerService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LockedRoomDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close the dialog and call leaveRoom and navigate to /home', () => {
        const yesButton = fixture.debugElement.query(By.css('.right-button')).nativeElement;
        yesButton.click();
        expect(dialogRefSpy.close).toHaveBeenCalled();
        expect(mockRoomManagerService.leaveRoom).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should close the dialog', () => {
        const noButton = fixture.debugElement.query(By.css('.left-button')).nativeElement;
        noButton.click();
        expect(dialogRefSpy.close).toHaveBeenCalled();
        expect(mockRoomManagerService.leaveRoom).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should call onYesClick()', () => {
        spyOn(component, 'onYesClick').and.callThrough();
        const yesButton = fixture.debugElement.query(By.css('.right-button')).nativeElement;
        yesButton.click();
        expect(component.onYesClick).toHaveBeenCalled();
    });

    it('should call onNoClick()', () => {
        spyOn(component, 'onNoClick').and.callThrough();
        const noButton = fixture.debugElement.query(By.css('.left-button')).nativeElement;
        noButton.click();
        expect(component.onNoClick).toHaveBeenCalled();
    });
});
