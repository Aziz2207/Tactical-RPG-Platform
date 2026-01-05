import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostGameAttributeComponent } from './post-game-attribute.component';

describe('PostGameAttributeComponent', () => {
    let component: PostGameAttributeComponent;
    let fixture: ComponentFixture<PostGameAttributeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PostGameAttributeComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PostGameAttributeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
