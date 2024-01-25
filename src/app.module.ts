import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomController } from './room/room.controller';
import { RoomService } from './room/room.service';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { RedisProvider } from 'providers';

@Module({
  imports: [
    RedisModule.forRoot({
      readyLog: true,
      config:{
        host: "172.17.0.3",
        port: 6379,
        // password: 'hunminjungwook' 
      }
    })
  ],
  controllers: [AppController, RoomController],
  providers: [AppService, RoomService, RedisProvider],
})
export class AppModule {}
