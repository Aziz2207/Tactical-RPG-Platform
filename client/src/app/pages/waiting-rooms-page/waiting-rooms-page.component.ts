import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '@app/components/header/header.component';
import { WaitingRoomsListComponent } from '@app/components/waiting-rooms-list/waiting-rooms-list.component';
import { PathRoute } from '@common/interfaces/route';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-waiting-rooms-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, WaitingRoomsListComponent, TranslateModule],
  templateUrl: './waiting-rooms-page.component.html',
  styleUrls: ['../../../common/css/game-list-page.scss', './waiting-rooms-page.component.scss'],
})
export class WaitingRoomsPageComponent {
  PathRoute = PathRoute;
}