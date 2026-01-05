import { inject, Injectable } from '@angular/core';
import { GameObject } from '@app/interfaces/game-object';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameObjectService } from '@app/services/game-object/game-object.service';
import { MapValidatorService } from '@app/services/map-validator/map-validator.service';
import { Game } from '@common/interfaces/game';
@Injectable({
    providedIn: 'root',
})
export class MapEditorService {
    mapToEdit: Game;
    private mapValidatorService = inject(MapValidatorService);
    private gameObjectService = inject(GameObjectService);
    private gameCreationService = inject(GameCreationService);

    getGridSize() {
        return this.gameCreationService.getStoredSize();
    }

    isMapChosen() {
        if (this.gameCreationService.sizeSubject.value) {
            return this.gameCreationService.sizeSubject.value;
        }
        return this.mapToEdit;
    }

    onDragEnd() {
        this.gameObjectService.isDraggingFromContainer = false;
    }

    removeObjectFromGrid(gameObject: GameObject) {
        this.gameObjectService.removeObjectFromGrid(gameObject);
    }

    isDraggingFromContainer() {
        return this.gameObjectService.isDraggingFromContainer;
    }

    getDraggedObject() {
        return this.gameObjectService.draggedObject;
    }

    isMapValid() {
        return this.mapValidatorService.validMap;
    }

    setMapToEdit(map: Game) {
        this.mapToEdit = map;
    }
}
