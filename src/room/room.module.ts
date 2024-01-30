import { Module } from '@nestjs/common';
import { AppGateway, RedisProvider } from 'providers';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RedisProvider, AppGateway, JwtService],
  exports: [],
})
export class RoomModule {}
