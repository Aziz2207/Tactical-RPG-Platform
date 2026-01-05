import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatMessageComponent } from './chat-message.component';

describe('ChatMessageComponent', () => {
    let component: ChatMessageComponent;
    let fixture: ComponentFixture<ChatMessageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChatMessageComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatMessageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should use provided avatar url when available', () => {
        const customUrl = 'https://example.com/avatar.png';
        component.avatarUrl = customUrl;
        fixture.detectChanges();

        expect(component.avatarSrc).toBe(customUrl);
    });

    it('should fallback to default avatar when loading fails', () => {
        const brokenUrl = 'https://example.com/missing.png';
        const fallback = (component as any).defaultAvatar;
        component.avatarUrl = brokenUrl;
        const img = { src: brokenUrl } as HTMLImageElement;

        component.handleAvatarError({ target: img } as unknown as Event);

        expect(component.avatarSrc).toBe(fallback);
        expect(img.src).toBe(fallback);
    });
});
