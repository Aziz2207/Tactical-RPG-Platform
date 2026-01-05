import { ComponentFixture, TestBed } from '@angular/core/testing';

import { mockPlayers } from '@app/mocks/mock-players';
import { gameObjects } from '@common/objects-info';
import { IngamePlayersSidebarComponent } from './ingame-players-sidebar.component';

describe('IngamePlayersSidebarComponent', () => {
    let component: IngamePlayersSidebarComponent;
    let fixture: ComponentFixture<IngamePlayersSidebarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [IngamePlayersSidebarComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(IngamePlayersSidebarComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return the flag', () => {
        component.sidebarPlayer = { ...mockPlayers[0] };
        component.sidebarPlayer.inventory = [gameObjects[8]];
        expect(component.isFlagInInventory()).toEqual(gameObjects[8]);
    });
});
