import { provideHttpClient } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Routes, provideRouter, withHashLocation } from '@angular/router';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { CreateCharacterComponent } from '@app/pages/create-character/create-character.component';
import { EditPageComponent } from '@app/pages/edit-page/edit-page.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { StartGamePageComponent } from '@app/pages/start-game-page/start-game-page.component';
import { WaitingRoomComponent } from '@app/pages/waiting-page/waiting-room.component';
import { GameEndComponent } from '@app/components/game-end/game-end/game-end.component';
import { environment } from './environments/environment';


if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: MainPageComponent },
    { path: 'start', component: StartGamePageComponent },
    { path: 'admin', component: AdminPageComponent },
    { path: 'characters', component: CreateCharacterComponent },
    { path: 'wait', component: WaitingRoomComponent },
    { path: 'edit', component: EditPageComponent },
    { path: 'game', component: GamePageComponent },
    { path: 'end', component: GameEndComponent},
    { path: '**', redirectTo: '/home' },
];

bootstrapApplication(AppComponent, {
    providers: [provideHttpClient(), provideRouter(routes, withHashLocation()), provideAnimations()],
});
