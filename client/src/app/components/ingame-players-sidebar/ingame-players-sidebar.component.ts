import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ObjectType } from '@common/constants';
import { Player } from '@common/interfaces/player';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Skull } from 'lucide-angular';

@Component({
    selector: 'app-ingame-players-sidebar',
    standalone: true,
    imports: [CommonModule, TranslateModule, LucideAngularModule],
    templateUrl: './ingame-players-sidebar.component.html',
    styleUrl: './ingame-players-sidebar.component.scss',
})
export class IngamePlayersSidebarComponent {
    @Input() sidebarPlayer: Player;
    public Skull = Skull;
    
    isFlagInInventory() {
        return this.sidebarPlayer.inventory.find((item) => item.id === ObjectType.Flag);
    }
}
