import { Overlay } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { JoinGameDialogComponent } from '@app/components/join-game-dialog/join-game-dialog.component';
import { of } from 'rxjs';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    let dialog: jasmine.SpyObj<MatDialog>;

    beforeEach(async () => {
        const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], { get: () => '' });
        dialog = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [{ provide: ActivatedRoute, useValue: activatedRouteSpy }, { provide: MatDialog, useValue: dialog }, Overlay],
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should prevent drag of the logo', () => {
        const event = new Event('dragstart');
        spyOn(event, 'preventDefault');
        const logo = fixture.debugElement.query(By.css('.app-logo')).nativeElement;
        logo.dispatchEvent(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should have "Rejoindre"', () => {
        const joinButton = fixture.debugElement.query(By.css('.header-btn:nth-child(1) span')).nativeElement;
        expect(joinButton.textContent).toContain('Rejoindre');
    });

    it('should have "Créer"', () => {
        const createButton = fixture.debugElement.query(By.css('.header-btn:nth-child(2) span')).nativeElement;
        expect(createButton.textContent).toContain('Créer');
    });

    it('should have "Admin"', () => {
        const adminButton = fixture.debugElement.query(By.css('.header-btn:nth-child(3) span')).nativeElement;
        expect(adminButton.textContent).toContain('Admin');
    });

    it('should have links', () => {
        const joinButton = fixture.debugElement.query(By.css('.header-btn:nth-child(1)')).nativeElement;
        const createButton = fixture.debugElement.query(By.css('.header-btn:nth-child(2)')).nativeElement;
        const adminButton = fixture.debugElement.query(By.css('.header-btn:nth-child(3)')).nativeElement;

        expect(joinButton.getAttribute('ng-reflect-router-link')).toBe(null);
        expect(createButton.getAttribute('ng-reflect-router-link')).toBe('/start');
        expect(adminButton.getAttribute('ng-reflect-router-link')).toBe('/admin');
    });

    it('should open JoinGameDialogComponent when openJoinGameDialog is called', () => {
        dialog.open.and.returnValue({ afterClosed: () => of(null) } as MatDialogRef<JoinGameDialogComponent>);
        component.openJoinGameDialog();
        const expectedConfig = {
            width: '400px',
            height: '260px',
            scrollStrategy: TestBed.inject(Overlay).scrollStrategies.noop(),
            panelClass: ['join-dialog-container'],
        };
        expect(dialog.open).toHaveBeenCalledWith(JoinGameDialogComponent, expectedConfig);
    });
});
