import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { HeaderComponent } from "@app/components/header/header.component";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { UserAccount } from "@common/interfaces/user-account";
import { UserStatistics } from "@common/interfaces/user-statistics";
import {
    ClientToServerEvent,
    ServerToClientEvent,
} from "@common/socket.events";
import { TranslateModule } from "@ngx-translate/core";
import { CommonModule } from "@angular/common";

interface LeaderboardUser extends UserAccount {
    statistics?: UserStatistics;
    totalGamesPlayed?: number;
    winRate?: number;
    totalGameDuration?: number;
}

@Component({
    selector: "app-leaderboards-page",
    standalone: true,
    imports: [HeaderComponent, TranslateModule, RouterLink, CommonModule],
    templateUrl: "./leaderboards-page.component.html",
    styleUrl: "./leaderboards-page.component.scss",
})
export class LeaderboardsPageComponent {
    users: LeaderboardUser[] = [];
    isLoading: boolean = false;
    sortColumn: string = "lifetimeEarnings";
    sortDirection: "asc" | "desc" = "desc";

    constructor(
        public userService: UserAccountService,
        private socketService: SocketCommunicationService
    ) {}

    getCurrentUid() {
        return this.userService.accountDetails()?.uid;
    }

    isUserBlocked(uid: string): boolean {
      return this.userService.isUserBlocked(uid);
    }

    isUserBlockedByAnother(uid: string): boolean {
      const currentUid = this.getCurrentUid();
      if (!currentUid) return false;

      const user = this.userService.everyUser.find(u => u.uid === uid);
      return !!user?.blockedUsers?.includes(currentUid);
    }

    async ngOnInit() {
        this.isLoading = true;
        await this.socketService.connect();
        this.socketService.on<UserStatistics[] | UserStatistics>(
            ServerToClientEvent.AllUserStatistics,
            (response: UserStatistics[] | UserStatistics) => {

                let allStatistics: UserStatistics[] = [];

                if (Array.isArray(response)) {
                    allStatistics = response;
                } else if (response && typeof response === "object") {
                    if ("uid" in response) {
                        allStatistics = [response];
                    } else {
                        allStatistics = Object.values(response);
                    }
                }


                this.users = this.users.map((user) => {
                    const stats = allStatistics.find(
                        (stat) => stat && stat.uid === user.uid
                    );

                    if (stats) {
                        const totalGamesPlayed =
                            (stats.numOfClassicPartiesPlayed || 0) +
                            (stats.numOfCTFPartiesPlayed || 0);

                        const rawWinRate =
                            totalGamesPlayed > 0
                                ? ((stats.numOfPartiesWon || 0) /
                                      totalGamesPlayed) *
                                  100
                                : 0;

                        const winRate = Number(rawWinRate.toFixed(2));

                        const totalGameDuration =
                            stats.gameDurationsForPlayer &&
                            stats.gameDurationsForPlayer.length > 0
                                ? stats.gameDurationsForPlayer.reduce(
                                    (sum, duration) => sum + (Number(duration) || 0),
                                    0
                                  )
                                : 0;

                        return {
                            ...user,
                            statistics: stats,
                            totalGamesPlayed,
                            winRate,
                            totalGameDuration,
                        };
                    }

                    return {
                        ...user,
                        totalGamesPlayed: 0,
                        winRate: 0,
                        totalGameDuration: 0,
                    };
                });
                
                this.sortUsers();

                this.isLoading = false;
            }
        );

        this.userService.everyUser$.subscribe((users) => {
            if (users.length > 0) {
                this.users = [...users];

                this.socketService.send(
                    ClientToServerEvent.GetAllUserStatistics
                );
            }
        });

        this.userService.getEveryUser();
    }

    sortBy(column: string) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
        } else {
            this.sortColumn = column;
            this.sortDirection = "desc";
        }
        this.sortUsers();
    }

    sortUsers() {
        this.users.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (this.sortColumn) {
                case "lifetimeEarnings":
                    aValue = a.lifetimeEarnings || 0;
                    bValue = b.lifetimeEarnings || 0;
                    break;
                case "gamesPlayed":
                    aValue = a.totalGamesPlayed || 0;
                    bValue = b.totalGamesPlayed || 0;
                    break;
                case "wins":
                    aValue = a.statistics?.numOfPartiesWon || 0;
                    bValue = b.statistics?.numOfPartiesWon || 0;
                    break;
                case "winRate":
                    aValue = a.winRate || 0;
                    bValue = b.winRate || 0;
                    break;
                case "duration":
                    aValue = Number(a.totalGameDuration) || 0;
                    bValue = Number(b.totalGameDuration) || 0;
                    break;
                default:
                    return 0;
            }

            if (typeof aValue === "string") {
                return this.sortDirection === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else {
                return this.sortDirection === "asc"
                    ? aValue - bValue
                    : bValue - aValue;
            }
        });
    }

    formatDuration(seconds: number): string {
        if (!seconds || seconds === 0) return "00:00:00";

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    ngOnDestroy() {
        this.socketService.off(ServerToClientEvent.UserStatistics);
    }

    isFriend(uid: string): boolean {
        const result = this.userService.friends.some(f => f.uid === uid);
        return result;
    }
}
