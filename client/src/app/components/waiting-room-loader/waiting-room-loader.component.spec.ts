import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaitingRoomLoaderComponent } from './waiting-room-loader.component';

describe('WaitingRoomLoaderComponent', () => {
    let component: WaitingRoomLoaderComponent;
    let fixture: ComponentFixture<WaitingRoomLoaderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WaitingRoomLoaderComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitingRoomLoaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
