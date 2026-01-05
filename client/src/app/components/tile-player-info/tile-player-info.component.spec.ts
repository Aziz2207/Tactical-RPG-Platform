import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ITEM_COUNT } from '@app/constants';
import { mockPlayers } from '@app/mocks/mock-players';
import { GameTileInfoService } from '@app/services/game-tile-info/game-tile-info.service';
import { ObjectType } from '@common/constants';
import { TilePlayerInfoComponent } from './tile-player-info.component';

describe('TilePlayerInfoComponent', () => {
    let component: TilePlayerInfoComponent;
    let fixture: ComponentFixture<TilePlayerInfoComponent>;
    let gameTileInfoServiceSpy: jasmine.SpyObj<GameTileInfoService>;
    beforeEach(async () => {
        gameTileInfoServiceSpy = jasmine.createSpyObj('GameTileInfoService', ['getItem', 'getPlayer', 'getTile']);
        await TestBed.configureTestingModule({
            imports: [],
            providers: [TilePlayerInfoComponent, { provide: GameTileInfoService, useValue: gameTileInfoServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(TilePlayerInfoComponent);
        component = fixture.componentInstance;
        gameTileInfoServiceSpy.getPlayer.and.returnValue(mockPlayers[0]);
        gameTileInfoServiceSpy.getItem.and.returnValue({
            id: ObjectType.Trident,
            name: 'Trident de Poséidon',
            image: './assets/images/objects/poseidon-trident.jpg',
            description: 'Modifie le dé du joueur qui équipe cet objet : les valeurs équiprobables possibles sont 1, 2, 3, 5, 6, 6',
            count: ITEM_COUNT,
        });
        gameTileInfoServiceSpy.getTile.and.returnValue({ id: 1, name: 'Ice', image: 'image', descriptions: ['it makes you fall'] });
        fixture.detectChanges();
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should emit closePopup event when close is called', () => {
        spyOn(component.closePopup, 'emit');
        component.close();
        expect(component.closePopup.emit).toHaveBeenCalled();
    });
});
