import { Module } from '@nestjs/common';
import { LobbyGateway } from 'src/lobby/lobby.gateway';
import { AppGateway, RedisProvider } from 'src/providers';
import { RoomManager } from 'src/providers/room.manager';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RedisProvider, AppGateway, LobbyGateway, RoomManager],
  exports: [],
})
export class RoomModule {}
