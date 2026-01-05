import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContainerToolsComponent } from '@app/components/map-editor/container-tools/container-tools.component';
import { TileId } from '@app/constants';
import { ToolService } from '@app/services/tool/tool.service';

class MockToolService {
    selectedTile: string | null = null;

    setSelectedTile(tile: string) {
        this.selectedTile = tile;
    }
}

describe('ContainerToolsComponent', () => {
    let component: ContainerToolsComponent;
    let fixture: ComponentFixture<ContainerToolsComponent>;
    let toolService: MockToolService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [{ provide: ToolService, useClass: MockToolService }],
        });

        fixture = TestBed.createComponent(ContainerToolsComponent);
        component = fixture.componentInstance;
        toolService = TestBed.inject(ToolService);
    });

    it('should set the selected tile when onSelectTile is called', () => {
        const tile = TileId.Door;
        component.onSelectTile(tile);

        expect(toolService.selectedTile).toBe(tile);
    });
});
