import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
    let component: ButtonComponent;
    let fixture: ComponentFixture<ButtonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ButtonComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the input text in the button', () => {
        component.text = 'Click Me';
        fixture.detectChanges();

        const buttonElement: HTMLElement = fixture.nativeElement.querySelector('button');
        const spanElement: HTMLElement | null = buttonElement.querySelector('span');

        expect(spanElement?.textContent).toBe('Click Me');
    });
});
