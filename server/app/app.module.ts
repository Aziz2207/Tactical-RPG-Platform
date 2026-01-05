import { LoggerModule } from "@app/modules/logger/logger.module";
import { RoomModule } from "@app/modules/room/room.module";
import { PrivateRoomModule } from '@app/modules/private-room/private-room.module';
import { WaitingRoomsModule } from '@app/modules/waiting-rooms/waiting-rooms.module';
import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { SocketGateway } from "./gateways/socket/socket.gateway";
import { ChatModule } from "./modules/chat/chat.module";
import { BotService } from "./services/bot/bot.service";
import { CombatService } from "./services/combat/combat.service";
import { GameLogsService } from "./services/game-logs/game-logs.service";
import { GameService } from "./services/game/game.service";
import { MatchService } from "./services/match/match.service";
import { MessageService } from "./services/message/message.service";
import { PlayerInventoryService } from "./services/player-inventory/player-inventory.service";
import { RoomService } from "./services/room/room.service";
import { FirebaseAdminModule } from "./modules/firebase-admin/firebase-admin.module";
import { FriendService } from "./services/friend/friend.service";
import { UserService } from "./services/user/user.service";
import { UserController } from "./controllers/user/user.controller";
import { UserStatisticsService } from "./services/user-statistics/user-statistics.service";
import { MapService } from "./services/map/map.service";
import { mapSchema } from "./model/schema/map.schema";
import { MapController } from "./controllers/map/map.controller";
import { SavingService } from "./services/saving/saving.service";
import { ChallengeService } from "./services/challenge/challenge.service";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>("DATABASE_CONNECTION_STRING"),
      }),
    }),
    MongooseModule.forFeature([{ name: Map.name, schema: mapSchema }]),
    ChatModule,
    RoomModule,
    PrivateRoomModule,
    WaitingRoomsModule,
    LoggerModule,
    FirebaseAdminModule,
  ],
  providers: [
    MatchService,
    RoomService,
    SocketGateway,
    Logger,
    GameService,
    GameLogsService,
    CombatService,
    BotService,
    PlayerInventoryService,
    MessageService,
    FriendService,
    UserStatisticsService,
    UserService,
    MapService,
    SavingService,
    ChallengeService
  ],
  controllers: [UserController,MapController],
})
export class AppModule {}
