import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { TemporaryDialogComponent } from "@app/components/temporary-dialog/temporary-dialog.component";
import {
  ATTACK_TIME,
  DialogMessages,
  DialogTitle,
  INFO_DIALOG_TIME,
} from "@app/constants";
import { TempDialogData } from "@app/interfaces/temp-dialog-data";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import {
  CombatPlayers,
  CombatResult,
  CombatResultDetails,
} from "@common/interfaces/combat-info";
import { Player } from "@common/interfaces/player";
import { ServerToClientEvent } from "@common/socket.events";
import { TranslateService } from "@ngx-translate/core";
import { BehaviorSubject } from "rxjs";
@Injectable({
  providedIn: "root",
})
export class CombatService {
  /* eslint-disable @typescript-eslint/member-ordering */
  private combatTurnTimeSource = new BehaviorSubject<number>(ATTACK_TIME);
  combatTurnTime$ = this.combatTurnTimeSource.asObservable();

  activePlayer: Player;
  opponent: Player;
  attacker: Player;
  defender: Player;
  combatStatus: string = "";
  turnMessage: string;
  activePlayerResult: CombatResult;
  opponentResult: CombatResult;
  isInCombat: boolean = false;
  evasionsActivePlayer: number[];
  evasionsOpponent: number[];
  canAttackOrEvade: boolean = false;
  isSpectator: boolean = false;
  isPlayerEliminated: boolean = false;
  private attackResult: CombatResult;
  private defenseResult: CombatResult;

  constructor(
    private socketCommunicationService: SocketCommunicationService,
    private dialog: MatDialog,
    private translateService: TranslateService
  ) {
    this.activePlayerResult = { total: 0, diceValue: 1 };
    this.opponentResult = { total: 0, diceValue: 1 };
  }

  initializeCombat(
    combatPlayers: CombatPlayers,
    isActivePlayerAttacker: boolean
  ) {
    this.activePlayer = isActivePlayerAttacker
      ? combatPlayers.attacker
      : combatPlayers.defender;
    this.opponent = isActivePlayerAttacker
      ? combatPlayers.defender
      : combatPlayers.attacker;
    this.attacker = combatPlayers.attacker;
    this.defender = combatPlayers.defender;
    this.isInCombat = true;
    this.combatStatus = "";
    this.canAttackOrEvade = true;
    this.evasionsActivePlayer = new Array(2).fill(1);
    this.evasionsOpponent = new Array(2).fill(1);
    this.setTurnMessage();
  }

  initSocketListeners() {
    this.socketCommunicationService.on(
      ServerToClientEvent.CombatTime,
      (timeRemaining: number) => {
        this.combatTurnTimeSource.next(timeRemaining);
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.AttackValues,
      (combatResultDetails: CombatResultDetails) => {
        this.onAttackValues(combatResultDetails);
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.AttackSuccess,
      (data: { attacker: Player; damage: number }) => {
        this.onAttackSuccess(data.attacker, data.damage);
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.AttackFail,
      (data: {
        attacker: Player;
        shouldDamageSelf: boolean;
        damage: number;
      }) => {
        this.combatStatus = this.translateService.instant(
          "GAME.LOGS.ATTACK_FAIL",
          { playerName: data.attacker?.name }
        );
        if (data.shouldDamageSelf) {
          this.onAttackFailWithArmor(data.damage);
        }
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.EvasionSuccess,
      (data: { listPlayers: Player[]; player: Player }) => {
        this.onEvasion(data.player);
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.EvasionFail,
      (player: Player) => {
        this.combatStatus = this.translateService.instant(
          "GAME.LOGS.EVADE_COMBAT_FAIL",
          { playerName: player?.name }
        );
        const evasionsLeft = this.isAttacker(this.activePlayer)
          ? this.evasionsActivePlayer
          : this.evasionsOpponent;
        evasionsLeft.pop();
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.CombatTurnEnded,
      (data: { combatPlayers: CombatPlayers; failEvasion: boolean }) => {
        this.onCombatTurnEnded(data.combatPlayers, data.failEvasion);
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.DefaultCombatWin,
      () => {
        this.onPlayerDisconnected();
        this.isInCombat = false;
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.UpdateStats,
      (combatPlayers: CombatPlayers) => {
        if (this.isAttacker(this.activePlayer)) {
          this.activePlayer.attributes.attack =
            combatPlayers.attacker.attributes.attack;
          this.opponent.attributes.defense =
            combatPlayers.defender.attributes.defense;
        } else {
          this.activePlayer.attributes.defense =
            combatPlayers.defender.attributes.defense;
          this.opponent.attributes.attack =
            combatPlayers.attacker.attributes.attack;
        }
      }
    );
  }

  removeListeners() {
    this.socketCommunicationService.off(ServerToClientEvent.CombatTime);
    this.socketCommunicationService.off(ServerToClientEvent.AttackValues);
    this.socketCommunicationService.off(ServerToClientEvent.AttackSuccess);
    this.socketCommunicationService.off(ServerToClientEvent.AttackFail);
    this.socketCommunicationService.off(ServerToClientEvent.EvasionFail);
    this.socketCommunicationService.off(ServerToClientEvent.CombatTurnEnded);
    this.socketCommunicationService.off(ServerToClientEvent.DefaultCombatWin);
  }

  evasionLeft() {
    const evasionsLeft = this.isAttacker(this.activePlayer)
      ? this.evasionsActivePlayer
      : this.evasionsOpponent;
    return evasionsLeft.length > 0;
  }

  onPlayerDisconnected() {
    this.dialog.open(TemporaryDialogComponent, {
      disableClose: true,
      data: {
        title: DialogTitle.DefaultFightWin,
        message: this.translateService.instant(DialogMessages.DefaultFightWin),
        duration: INFO_DIALOG_TIME,
      },
    });
  }

  onCombatEnd(winner: Player) {
    if (this.isInCombat) {
      this.openTempDialog({
        title: this.translateService.instant(DialogTitle.EndFight),
        message: this.translateService.instant(DialogMessages.EndFight, {
          winner: winner?.name,
        }),
        duration: INFO_DIALOG_TIME,
      }).subscribe(() => {
        this.isInCombat = false;
      });
    }
  }

  onCombatTurnEnded(combatPlayers: CombatPlayers, failEvasion: boolean) {
    if (!failEvasion) {
      this.activePlayerResult = this.determineStats(this.activePlayer);
      this.opponentResult = this.determineStats(this.opponent);
    }
    this.canAttackOrEvade = true;
    this.attacker = combatPlayers.attacker;
    this.defender = combatPlayers.defender;
    this.setTurnMessage();
  }

  onEvasion(player: Player) {
    this.openTempDialog({
      title: this.translateService.instant(DialogTitle.SuccessEvasion),
      message: this.translateService.instant("GAME.LOGS.EVADE_COMBAT_SUCCESS", {
        playerName: player?.name,
      }),
      duration: INFO_DIALOG_TIME,
    }).subscribe(() => {
      this.isInCombat = false;
    });
  }

  onAttackSuccess(player: Player, damage: number) {
    if (this.isAttacker(this.activePlayer)) {
      this.opponent.attributes.currentHp =
        this.opponent.attributes.currentHp - damage < 0
          ? 0
          : this.opponent.attributes.currentHp - damage;
    } else {
      this.activePlayer.attributes.currentHp =
        this.activePlayer.attributes.currentHp - damage < 0
          ? 0
          : this.activePlayer.attributes.currentHp - damage;
    }
    this.combatStatus = this.translateService.instant(
      "GAME.LOGS.ATTACK_SUCCESS",
      { playerName: player?.name, damage: damage }
    );
  }

  onAttackFailWithArmor(damage: number) {
    if (this.isAttacker(this.activePlayer)) {
      this.activePlayer.attributes.currentHp =
        this.activePlayer.attributes.currentHp - damage < 0
          ? 0
          : this.activePlayer.attributes.currentHp - damage;
    } else {
      this.opponent.attributes.currentHp =
        this.opponent.attributes.currentHp - damage < 0
          ? 0
          : this.opponent.attributes.currentHp - damage;
    }
  }

  onAttackValues(combatResultDetails: CombatResultDetails) {
    this.canAttackOrEvade = false;
    this.attackResult = combatResultDetails.attackValues;
    this.defenseResult = combatResultDetails.defenseValues;
  }

  openTempDialog(dialogData: TempDialogData) {
    const dialogRef = this.dialog.open(TemporaryDialogComponent, {
      disableClose: true,
      data: dialogData,
    });
    return dialogRef.afterClosed();
  }

  resetPlayerHp(player1: Player, player2: Player) {
    player1.attributes.currentHp = player1.attributes.totalHp;
    player2.attributes.currentHp = player2.attributes.totalHp;
  }

  determineStats(player: Player) {
    return this.isAttacker(player) ? this.attackResult : this.defenseResult;
  }

  isAttacker(player: Player) {
    return this.attacker && player.id === this.attacker.id;
  }

  isCurrentTurn() {
    return this.socketCommunicationService.socket.id === this.attacker.id;
  }

  isCurrentPlayer(player: Player) {
    return this.socketCommunicationService.socket.id === player.id;
  }

  setTurnMessage() {
    if (this.isSpectator || this.isPlayerEliminated) {
      this.turnMessage = this.translateService.instant(
        "GAME.COMBAT.VIEWER_TURN_START_MESSAGE",
        { attackerName: this.attacker.name }
      );
      return;
    }
    this.turnMessage = this.isCurrentTurn()
      ? this.translateService.instant("GAME.COMBAT.YOUR_TURN_START")
      : this.translateService.instant("GAME.COMBAT.OPPONENT_TURN_START");
  }
}
