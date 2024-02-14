import { Module } from '@nestjs/common';
import { LobbyGateway } from 'src/lobby/lobby.gateway';
import { RedisProvider, RoomManager } from 'src/providers';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [RoomController],
  providers: [RoomService, RedisProvider, LobbyGateway, RoomManager],
  exports: [],
})
export class RoomModule {}
