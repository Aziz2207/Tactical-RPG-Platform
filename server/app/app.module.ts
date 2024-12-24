import { ChatGateway } from '@app/gateways/chat/chat.gateway';
import { Game, gameSchema } from '@app/model/database/game';
import { DateService } from '@app/services/date/date.service';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { GameController } from './controllers/game/game.controller';
import { RoomController } from './controllers/room/room.controller';
import { GameLogicGateway } from './gateways/game-logic/game-logic.gateway';
import { GameSessionGateway } from './gateways/game-session/game-session.gateway';
import { ActionsService } from './services/actions/actions.service';
import { ActiveSessionService } from './services/active-session/active-session.service';
import { CombatService } from './services/combat/combat-service.service';
import { GameControllerService } from './services/game-controller/game-controller.service';
import { GameInfoService } from './services/game-info/game-info.service';
import { GameTimerService } from './services/game-timer/game-timer.service';
import { GameService } from './services/game/game.service';
import { PlayerMovementService } from './services/player-movement/player-movement.service';
import { RoomService } from './services/rooms/rooms.service';
import { TileValidityService } from './services/tile-validity/tile-validity.service';
import { TurnService } from './services/turn/turn.service';
import { ValidateGameService } from './services/validate-game/validate-game.service';
import { VirtualPlayerService } from './services/virtual-player/virtual-player.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                uri: config.get<string>('DATABASE_CONNECTION_STRING'), // Loaded from .env
            }),
        }),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
        EventEmitterModule.forRoot(),
    ],
    controllers: [GameController, RoomController],
    providers: [
        ChatGateway,
        DateService,
        Logger,
        GameService,
        ValidateGameService,
        GameSessionGateway,
        RoomService,
        GameLogicGateway,
        GameTimerService,
        VirtualPlayerService,
        ActiveSessionService,
        PlayerMovementService,
        CombatService,
        GameInfoService,
        TileValidityService,
        TurnService,
        GameControllerService,
        ActionsService,
    ],
})
export class AppModule {}
