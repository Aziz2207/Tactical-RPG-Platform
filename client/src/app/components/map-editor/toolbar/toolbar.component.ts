import { Component } from '@angular/core';
import { ContainerToolsComponent } from '@app/components/map-editor/container-tools/container-tools.component';
@Component({
    selector: 'app-toolbar',
    standalone: true,
    imports: [ContainerToolsComponent],
    templateUrl: './toolbar.component.html',
    styleUrl: './toolbar.component.scss',
})
export class ToolbarComponent {}
