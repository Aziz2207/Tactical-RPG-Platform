import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { ChatComponent } from '@app/components/chat/chat.component';
import { GameBoxComponent } from './game-box.component';

describe('GameBoxComponent', () => {
    let component: GameBoxComponent;
    let fixture: ComponentFixture<GameBoxComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameBoxComponent, MatIconModule, ChatComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameBoxComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with messages as the active window', () => {
        expect(component.activeWindow).toBe('journal');
    });

    it('should switch to messages window', () => {
        component.activeWindow = 'journal';
        component.switchWindow('messages');
        expect(component.activeWindow).toBe('messages');
    });

    it('should switch to journal window', () => {
        component.switchWindow('journal');
        expect(component.activeWindow).toBe('journal');
    });
});
