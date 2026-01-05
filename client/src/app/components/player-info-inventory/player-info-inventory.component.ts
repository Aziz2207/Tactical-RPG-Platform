import { CommonModule } from "@angular/common";
import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import { GameObjectComponent } from "@app/components/map-editor/game-object/game-object.component";
import { MAX_INVENTORY_ITEMS } from "@app/constants";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { ObjectType } from "@common/constants";
import { Player, Status } from "@common/interfaces/player";
import { Room } from "@common/interfaces/room";
import { ServerToClientEvent } from "@common/socket.events";
import { TranslateModule } from "@ngx-translate/core";

@Component({
  selector: "app-player-info-inventory",
  standalone: true,
  imports: [
    GameObjectComponent,
    GameObjectComponent,
    TranslateModule,
    CommonModule,
  ],
  templateUrl: "./player-info-inventory.component.html",
  styleUrl: "./player-info-inventory.component.scss",
})
export class PlayerInfoInventoryComponent implements OnInit {
  @Input() playerId: string | undefined;
  @Input() activePlayer: Player;
  @ViewChild("hpBar") healthBar: ElementRef<HTMLProgressElement>;
  player: Player;
  actionPointsArray: number[];
  movementPointsArray: number[];
  descriptionPosition: string = "bottom";
  constructor(private socketCommunicationService: SocketCommunicationService) {}

  get emptySlots(): number[] {
    const emptySlotsCount =
      MAX_INVENTORY_ITEMS - (this.player?.inventory?.length || 0);
    return Array.from({ length: emptySlotsCount }, () => 0);
  }

  ngOnInit() {
    this.socketCommunicationService.on<Room>(
      ServerToClientEvent.MapInformation,
      (room: Room) => {
        const foundPlayer = room.listPlayers.find(
          (player) => player.uid === this.playerId
        );
        if (foundPlayer) {
          this.player = foundPlayer;
          this.actionPointsArray = Array(this.player.attributes.actionPoints);
          this.movementPointsArray = Array(
            this.player.attributes.movementPointsLeft
          );
        }
      }
    );

    this.socketCommunicationService.on<Player>(
      ServerToClientEvent.UpdatedInventory,
      (playerToUpdate: Player) => {
        if (this.player.name === playerToUpdate.name) {
          this.player.attributes = playerToUpdate.attributes;
          this.player.inventory = playerToUpdate.inventory;
          this.player.attributes.currentHp =
            playerToUpdate.attributes.currentHp;
        }
      }
    );

    this.socketCommunicationService.on<Player[]>(
      ServerToClientEvent.UpdateAllPlayers,
      (playerList: Player[]) => {
        const foundPlayer = playerList.find(
          (player) => player.uid === this.player.uid
        );
        this.movementPointsArray = Array(
          foundPlayer?.attributes.movementPointsLeft
        );
      }
    );
    this.socketCommunicationService.on<Player>(
      ServerToClientEvent.PlayerEliminated,
      (eliminatedPlayer: Player) => {
        const isPlayer = eliminatedPlayer.uid === this.player.uid;
        if (isPlayer) {
          this.player = eliminatedPlayer;
          this.player.position = { x: 100, y: 100 };
          this.player.attributes.currentHp = 0;
          this.player.status = Status.Disconnected;
          this.player.inventory = [];
          this.actionPointsArray = Array(0);
          this.movementPointsArray = Array(0);
        }
      }
    );
  }

  getActionArray() {
    if (this.activePlayer.attributes.actionPoints < 0) {
      this.activePlayer.attributes.actionPoints = 0;
    }
    return this.activePlayer.uid === this.player.uid
      ? Array(this.activePlayer.attributes.actionPoints)
      : Array(this.player.attributes.actionPoints);
  }

  hasXiphos(player: Player) {
    return player.inventory.find((items) => items.id === ObjectType.Xiphos);
  }
}
