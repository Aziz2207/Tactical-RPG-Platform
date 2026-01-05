import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { PlayerStatisticsComponent } from "@app/components/player-statistics/player-statistics.component";
import { PostGameAttributeComponent } from "@app/components/post-game-attribute/post-game-attribute.component";
import { SingleGlobalStatComponent } from "@app/components/single-global-stat/single-global-stat.component";
import { GLOBAL_STAT_TYPES, LOSER_PRIZE, WINNER_PRIZE } from "@app/constants";
import { defaultGlobalStats } from "@app/mocks/default-global-stats";
import { PostGameService } from "@app/services/post-game/post-game.service";
import { GameService } from "@app/services/sockets/game/game.service";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { GlobalPostGameStat } from "@common/interfaces/global-post-game-stats";
import { HeaderComponent } from "@app/components/header/header.component";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { Player } from "@common/interfaces/player";
import { ChallengeKey } from "@common/interfaces/challenges";
import { ClientToServerEvent, ServerToClientEvent } from "@common/socket.events";
import { ChatBoxComponent } from "@app/components/chat-box/chat-box.component";

@Component({
    selector: "app-post-game-page",
    standalone: true,
    imports: [
        PlayerStatisticsComponent,
        CommonModule,
        PostGameAttributeComponent,
        SingleGlobalStatComponent,
        HeaderComponent,
        TranslateModule,
        ChatBoxComponent
    ],
    templateUrl: "./post-game-page.component.html",
    styleUrl: "./post-game-page.component.scss",
})
export class PostGamePageComponent implements OnInit, OnDestroy {
    @ViewChild(HeaderComponent) headerComponent!: HeaderComponent;
    
    globalStats: GlobalPostGameStat[] = GLOBAL_STAT_TYPES;
    balanceVariation: number = 0;
    winnerPrize: number = WINNER_PRIZE;
    loserPrize: number = LOSER_PRIZE;
    showBalanceBreakdown: boolean = false;
    private _isSpectator: boolean = false;
    
    constructor(
        private socketCommunicationService: SocketCommunicationService,
        public postGameService: PostGameService,
        private gameService: GameService,
        private userAccountService: UserAccountService,
        private translateService: TranslateService,
    ) {}

    titre() {
        return (
            this.translateService.instant('POST_GAME_LOBBY.TITLE') + ': ' +
            (this.postGameService.isFlagMode ? 
                this.translateService.instant('POST_GAME_LOBBY.CTF') : 
                this.translateService.instant('POST_GAME_LOBBY.CLASSIC'))
        );
    }

    get balanceUpdate(): number {
        return this.isSpectator() ? 0 : this.balanceVariation;
    }

    get isFriendsBarOpen(): boolean {
        return this.headerComponent?.friendsBarOpen ?? false;
    }

    ngOnInit() {
        this.postGameService.computeStats();
        this.checkSpectatorStatus();
    }

    checkSpectatorStatus() {
        this.socketCommunicationService.send(ClientToServerEvent.GetSpectatorStatus);
        this.socketCommunicationService.once<boolean>(ServerToClientEvent.SpectatorStatus, (isSpectator: boolean) => {
            this._isSpectator = isSpectator;
            if (!isSpectator) {
                this.computeBalanceVariation();
            }
        });
    }

    getTilesVisited(player: Player): number {
        return new Set(player.positionHistory.map(pos => `${pos.x},${pos.y}`)).size;
    }

    rewardChallenge(): number {
        if (this.isSpectator()) {
            return 0;
        }
        const player = this.getCurrentPlayer();
        const { reward } = player.assignedChallenge;
        
        return this.isChallengeAchieved(player) ? reward : 0;
    }

    private isChallengeAchieved(player: Player): boolean {
        const { key, goal } = player.assignedChallenge;
        const stats = player.postGameStats;
        
        switch (key) {
            case ChallengeKey.VisitedTiles:
                return this.getTilesVisited(player) >= goal;
            case ChallengeKey.Evasions:
                return stats.evasions >= goal;
            case ChallengeKey.Items:
                return stats.itemsObtained >= goal;
            case ChallengeKey.Wins:
                return stats.victories >= goal;
            case ChallengeKey.DoorsInteracted:
                return stats.doorsInteracted >= goal;
            default:
                return false;
        }
    }


    computeBalanceVariation() {
        const isWinner = this.postGameService.isCurrentPlayerWinner();
        const challengeReward = this.rewardChallenge();
        
        const basePrize = isWinner ? this.winnerPrize : this.loserPrize;
        const poolShare = this.calculatePoolShare(isWinner);
        
        this.balanceVariation = basePrize + poolShare + challengeReward;
        this.userAccountService.adjustBalance(this.balanceVariation, true);
    }

    calculatePoolShare(isWinner: boolean): number {
        const entryFee = this.postGameService.gameRoom.entryFee ?? 0;
        const nbPlayers = this.postGameService.players.length;
        const totalPrizePool = entryFee * nbPlayers;
        
        if (totalPrizePool <= 0) {
            return 0;
        }
        
        if (isWinner) {
            return Math.floor((totalPrizePool * 2) / 3);
        }
        
        const nbLosers = nbPlayers - 1;
        return nbLosers > 0 ? Math.floor(totalPrizePool / 3 / nbLosers) : 0;
    }

    quitPostGameLobby() {
        this.gameService.openQuitPostGameLobby(
            this.postGameService.gameRoom.roomId
        );
    }

    getPostGameStatTypes() {
        return this.postGameService.postGameStatTypes;
    }

    getCurrentPlayer(): Player {
        return this.getPlayers().find(player => player.id === this.getSocketId()) ?? this.getPlayers()[0];
    }

    getSocketId() {
        return this.socketCommunicationService.socket?.id;
    }

    isSpectator(): boolean {
        return this._isSpectator;
    }

    getPlayers() {
        return this.postGameService.players;
    }

    isFlagMode() {
        return this.postGameService.isFlagMode;
    }

    getSelectedAttribute() {
        return this.postGameService.selectedAttribute;
    }

    getExplanations() {
        return this.postGameService.explanations;
    }

    ngOnDestroy() {
        this.postGameService.globalStats = defaultGlobalStats;
        this.socketCommunicationService.disconnect();
        this.socketCommunicationService.connect();
    }
}