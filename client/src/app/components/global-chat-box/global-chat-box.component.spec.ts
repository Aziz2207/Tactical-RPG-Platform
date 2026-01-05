import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GlobalChatBoxComponent } from './global-chat-box.component';

describe('GlobalChatBoxComponent', () => {
    let component: GlobalChatBoxComponent;
    let fixture: ComponentFixture<GlobalChatBoxComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GlobalChatBoxComponent, HttpClientTestingModule],
        }).compileComponents();

        fixture = TestBed.createComponent(GlobalChatBoxComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should not send empty messages', () => {
        spyOn(component, 'sendMessage');
        component.newMessage = '';
        component.sendMessage();
        expect(component.newMessage).toBe('');
    });
});