import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';

describe('MainPageComponent', () => {
    let fixture: ComponentFixture<MainPageComponent>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MainPageComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(MainPageComponent);
        fixture.autoDetectChanges();
        router = TestBed.inject(Router);
    });

    it('should create', () => {
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('should have a button "Joindre une partie"', () => {
        const joinButton = fixture.debugElement.query(By.css('button.opButtonBig'));
        expect(joinButton.nativeElement.textContent).toContain('JOINDRE UNE PARTIE');
    });

    it('should redirect to creation view when we click on "Créer une partie"', () => {
        spyOn(router, 'navigate');
        const createButton = fixture.debugElement.query(By.css('#createGameBtn')).nativeElement;
        createButton.click();
        expect(router.navigate).toHaveBeenCalledWith(['/start']);
    });

    it('should redirect to admin when we click on "Administrer"', () => {
        spyOn(router, 'navigate');
        const adminButton = fixture.debugElement.query(By.css('#adminBtn')).nativeElement;
        adminButton.click();
        expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should display the name and logo', () => {
        const logo1 = fixture.debugElement.query(By.css('#logo1'));
        const logo2 = fixture.debugElement.query(By.css('#logo2'));
        expect(logo1).toBeTruthy();
        expect(logo2).toBeTruthy();
    });

    it('should display the team number and the names', () => {
        const menuText = fixture.debugElement.query(By.css('.menu')).nativeElement.textContent;
        expect(menuText).toContain('Equipe #106');
        expect(menuText).toContain('Delany, Lyna, Aziz, Felix, Omar et Marc');
    });

    /* it('should navigate to join', () => {
        spyOn(router, 'navigate');
        const component = fixture.componentInstance;
        component.goToJoin();
        expect(router.navigate).toHaveBeenCalledWith(['/join']);
    });*/

    it('should navigate to admin', () => {
        spyOn(router, 'navigate');
        const component = fixture.componentInstance;
        component.goToAdmin();
        expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should navigate to create', () => {
        spyOn(router, 'navigate');
        const component = fixture.componentInstance;
        component.goToCreate();
        expect(router.navigate).toHaveBeenCalledWith(['/start']);
    });
});
