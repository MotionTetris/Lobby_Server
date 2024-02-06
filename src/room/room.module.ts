import { Module } from '@nestjs/common';
import { AppGateway, RedisProvider } from 'src/providers';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RedisProvider, AppGateway],
  exports: [],
})
export class RoomModule {}
