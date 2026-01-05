import { provideHttpClient, HttpClient } from "@angular/common/http";
import { enableProdMode, importProvidersFrom  } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { Routes, provideRouter, withHashLocation } from "@angular/router";
import { AdministrationPageComponent } from "@app/pages/administration-page/administration-page.component";
import { AppComponent } from "@app/pages/app/app.component";
import { CreateGamePageComponent } from "@app/pages/create-game-page/create-game-page.component";
import { GamePageComponent } from "@app/pages/game-page/game-page.component";
import { JoinGameComponent } from "@app/pages/join-game/join-game.component";
import { MainPageComponent } from "@app/pages/main-page/main-page.component";
import { MapEditorPageComponent } from "@app/pages/map-editor-page/map-editor-page.component";
import { WaitingPageComponent } from "@app/pages/waiting-page/waiting-page.component";
import { WaitingRoomsPageComponent } from "@app/pages/waiting-rooms-page/waiting-rooms-page.component";
import { PostGamePageComponent } from "@app/pages/post-game-page/post-game-page.component";
import { provideFirebaseApp, initializeApp } from "@angular/fire/app";
import { provideAuth, getAuth } from "@angular/fire/auth";
import { environment } from "./environments/environment";
import { SigninPageComponent } from "@app/pages/signin-page/signin-page.component";
import { SignupPageComponent } from "@app/pages/signup-page/signup-page.component";
import { provideFirestore, getFirestore } from "@angular/fire/firestore";
import { provideStorage, getStorage } from "@angular/fire/storage";
import { SettingsPageComponent } from "@app/pages/settings-page/settings-page.component";
import { StorePageComponent } from "@app/pages/store-page/store-page.component";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { Observable } from "rxjs";
import { LeaderboardsPageComponent } from "@app/pages/leaderboards-page/leaderboards-page.component";

export class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`./assets/i18n/${lang}.json`);
  }
}

export function createTranslateLoader(http: HttpClient) {
  return new CustomTranslateLoader(http);
}

if (environment.production) {
  enableProdMode();
}
const routes: Routes = [
  { path: "", redirectTo: "/home", pathMatch: "full" },
  { path: "game-creation", component: CreateGamePageComponent },
  { path: "home", component: MainPageComponent },
  { path: "administration", component: AdministrationPageComponent },
  { path: "edit-map", component: MapEditorPageComponent },
  { path: "waiting-page", component: WaitingPageComponent },
  { path: "waiting-rooms", component: WaitingRoomsPageComponent },
  { path: "join-game", component: JoinGameComponent },
  { path: "game-page", component: GamePageComponent },
  { path: "post-game-lobby", component: PostGamePageComponent },
  { path: "signin", component: SigninPageComponent },
  { path: "signup", component: SignupPageComponent },
  { path: "store-page", component: StorePageComponent},
  { path: "settings-page", component: SettingsPageComponent },
  { path: "leaderboards-page", component: LeaderboardsPageComponent },
  { path: "**", redirectTo: "/home" },
];
bootstrapApplication(AppComponent, {
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    provideAnimations(),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: "en",
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient],
        },
      })
    ),
  ],
});
