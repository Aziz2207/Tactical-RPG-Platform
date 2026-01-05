import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameObjectComponent } from '@app/components/map-editor/game-object/game-object.component';
import { ObjectType } from '@app/constants';
import { GameObject } from '@app/interfaces/game-object';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameObjectService } from '@app/services/game-object/game-object.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { ToolButtonService } from '@app/services/tool-button/tool-button.service';
import { GameMode } from '@common/constants';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-game-objects-container',
    standalone: true,
    templateUrl: './game-objects-container.component.html',
    styleUrls: ['./game-objects-container.component.scss'],
    imports: [FormsModule, GameObjectComponent, CommonModule, TranslateModule],
})
export class GameObjectsContainerComponent implements OnInit {
    gameObjects: GameObject[];
    isDraggingFromContainer: boolean = false;
    showDescription: boolean = true;
    descriptionPosition: string = 'left';

    constructor(
        private gameObjectService: GameObjectService,
        private toolButtonService: ToolButtonService,
        private mapEditorService: MapEditorService,
        private gameCreationService: GameCreationService,
    ) {}

    ngOnInit() {
        let isFlagMode;
        if (this.gameCreationService.isNewGame) {
            isFlagMode = this.gameCreationService.getGameMode() === GameMode.CaptureTheFlag;
        } else {
            isFlagMode = this.mapEditorService.mapToEdit.mode === GameMode.CaptureTheFlag;
        }
        this.gameObjects = Array.from(this.gameObjectService.objects).filter(
            (object) => object.id <= ObjectType.Spawn || (isFlagMode && object.id === ObjectType.Flag),
        );
        this.gameObjectService.resetObjectsCount();
        if (!this.gameCreationService.isNewGame) {
            this.gameObjectService.loadMapObjectCount();
        }
    }

    onDragStart(event: DragEvent, gameObject: GameObject) {
        if (this.toolButtonService.selectedButton) {
            this.toolButtonService.selectedButton.toggleActivation();
            this.toolButtonService.selectedButton = null;
        }

        if (gameObject.count === 0) {
            event.preventDefault();
            return;
        }
        this.gameObjectService.draggedObject = gameObject;
        this.isDraggingFromContainer = true;
        this.gameObjectService.isDraggingFromContainer = true;
    }

    onDragEnd() {
        this.isDraggingFromContainer = false;
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    onDrop(event: DragEvent, gameObjectId: number) {
        event.preventDefault();
        const gameObject = this.gameObjectService.draggedObject;
        if (this.isDraggingFromContainer) {
            return;
        }
        if (gameObject?.id === gameObjectId) {
            this.gameObjectService.removeObjectFromGrid(gameObject);
        }
    }
}
