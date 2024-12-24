import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientItem } from '@app/classes/item';
import { ClientMap } from '@app/classes/map';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { ItemEnum } from '@common/item-enum';
import { of } from 'rxjs';
import { ItemComponent } from './item.component';

describe('ItemComponent', () => {
    let component: ItemComponent;
    let fixture: ComponentFixture<ItemComponent>;
    let mockMapEditerService: jasmine.SpyObj<MapEditorService>;
    let mockItem: ClientItem;
    let mockMap: ClientMap;

    beforeEach(async () => {
        mockItem = new ClientItem(ItemEnum.ABomb, 1);
        mockItem.isOnGrid = false;
        mockMap = { _items: [mockItem] } as ClientMap;
        mockMapEditerService = jasmine.createSpyObj('MapEditerService', ['addDraggedItem'], { mapState$: of(mockMap) });

        await TestBed.configureTestingModule({
            imports: [ItemComponent],
            providers: [{ provide: MapEditorService, useValue: mockMapEditerService }],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have the correct item list', () => {
        fixture.detectChanges();
        expect(component.itemCountObj).toEqual({ [ItemEnum.ABomb]: { items: [mockItem], count: 1 } });
        expect(component.itemArray).toEqual([ItemEnum.ABomb]);
    });

    it('should set itemId', () => {
        const event = new DragEvent('dragstart');
        Object.defineProperty(event, 'dataTransfer', {
            value: {
                setData: jasmine.createSpy('setData'),
            },
        });
        component.onDragStart(event, ItemEnum.ABomb);
        expect(event.dataTransfer?.setData).toHaveBeenCalledWith('itemId', '1');
    });

    it('should not set itemId', () => {
        const event = new DragEvent('dragstart');
        Object.defineProperty(event, 'dataTransfer', {
            value: { setData: jasmine.createSpy('setData') },
        });
        component.itemCountObj['NonExistentItem'] = { items: [], count: 0 };
        component.onDragStart(event, 'NonExistentItem');
        expect(event.dataTransfer?.setData).not.toHaveBeenCalled();
    });

    it('should count items', () => {
        const newItem = new ClientItem(ItemEnum.ABomb, 2);
        newItem.isOnGrid = true;
        mockMap._items.push(newItem);

        component.countItems(mockMap);

        expect(component.itemCountObj).toEqual({
            [ItemEnum.ABomb]: { items: [mockItem, newItem], count: 1 },
        });
    });

    it('should increase the count', () => {
        const newItem = new ClientItem(ItemEnum.ABomb, 2);
        newItem.isOnGrid = false;
        mockMap._items.push(newItem);
        component.countItems(mockMap);
        expect(component.itemCountObj).toEqual({
            [ItemEnum.ABomb]: { items: [mockItem, newItem], count: 2 },
        });
    });

    it('should initialize itemCountObj', () => {
        const newItem = new ClientItem(ItemEnum.ABomb, 2);
        newItem.isOnGrid = true;
        mockMap._items = [newItem];
        component.countItems(mockMap);
        expect(component.itemCountObj).toEqual({
            [ItemEnum.ABomb]: { items: [newItem], count: 0 },
        });
    });
});
