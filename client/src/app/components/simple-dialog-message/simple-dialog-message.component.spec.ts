import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleDialogMessageComponent } from './simple-dialog-message.component';

describe('SimpleDialogMessageComponent', () => {
    let component: SimpleDialogMessageComponent;
    let fixture: ComponentFixture<SimpleDialogMessageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SimpleDialogMessageComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SimpleDialogMessageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
