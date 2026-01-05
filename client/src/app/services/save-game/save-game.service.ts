/* eslint-disable  @typescript-eslint/no-non-null-assertion */
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import {
  NB_ITEMS_LARGE_MAP,
  NB_ITEMS_MEDIUM_MAP,
  NB_ITEMS_SMALL_MAP,
  SIZE_LARGE_MAP,
  SIZE_MEDIUM_MAP,
  SIZE_SMALL_MAP,
} from "@app/constants";
import { Info } from "@app/interfaces/info";
import { environment } from "src/environments/environment";
import { lastValueFrom } from "rxjs";
import { FireAuthService } from "../user-account/fire-auth/fire-auth.service";

@Injectable({
  providedIn: "root",
})
export class SaveGameService {
  apiURL = `${environment.serverUrl}/maps`;
  gameInfoImported: Info;

  constructor(
    private http: HttpClient,
    private authService: FireAuthService
  ) {}

  async saveNewGame(informations: Info) {
    const playerNumber = this.getPlayerNumber(informations.height!);
    const mapToStore = this.createMapObject(informations, playerNumber, "");
    const token = await this.authService.getToken();

    return lastValueFrom(
      this.http.post(this.apiURL, mapToStore, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      })
    );
  }

  async replaceMap(informations: Info, id: string) {
    const playerNumber = this.getPlayerNumber(informations.height!);
    const mapToReplace = this.createMapObject(informations, playerNumber, id);
    const token = await this.authService.getToken();

    return lastValueFrom(
      this.http.put(this.apiURL, mapToReplace, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      })
    );
  }

  private getPlayerNumber(height: number): number {
    switch (height) {
      case SIZE_SMALL_MAP:
        return NB_ITEMS_SMALL_MAP;
      case SIZE_MEDIUM_MAP:
        return NB_ITEMS_MEDIUM_MAP;
      case SIZE_LARGE_MAP:
        return NB_ITEMS_LARGE_MAP;
      default:
        throw new Error("Taille de carte invalide");
    }
  }

  private createMapObject(
    informations: Info,
    playerNumber: number,
    id: string | null
  ) {
    if (id) {
      return {
        _id: id,
        name: informations.name,
        description: informations.description,
        visible: false,
        mode: informations.mode,
        nbPlayers: playerNumber,
        image: informations.image,
        tiles: informations.grid,
        dimension: informations.height,
        itemPlacement: informations.items,
        state: informations.state,
        creatorId: informations.creatorId,
        creatorUsername: informations.creatorUsername,
        isSelected: false,
        lastModification: new Date(),
      };
    }
    return {
      name: informations.name,
      description: informations.description,
      visible: false,
      mode: informations.mode,
      nbPlayers: playerNumber,
      image: informations.image,
      tiles: informations.grid,
      dimension: informations.height,
      itemPlacement: informations.items,
      state: informations.state,
      creatorId: informations.creatorId,
      creatorUsername: informations.creatorUsername,
      isSelected: false,
      lastModification: new Date(),
    };
  }
}
