import { mapSchema } from "@app/model/schema/map.schema";
import { ChatModule } from "@app/modules/chat/chat.module";
import { RoomService } from "@app/services/room/room.service";
import { UserService } from "@app/services/user/user.service";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

@Module({
  imports: [
    ChatModule,
    MongooseModule.forFeature([{ name: Map.name, schema: mapSchema }]),
  ],
  providers: [RoomService, UserService],
  exports: [RoomService],
})
export class RoomModule {}
