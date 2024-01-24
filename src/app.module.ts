import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomController } from './room/room.controller';
import { RoomService } from './room/room.service';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { RedisProvider } from 'providers';
import { JwtModule } from '@nestjs/jwt'
import config from '../config'
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from 'providers/jwt.auth';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    RedisModule.forRoot({
      readyLog: true,
      config:{
        host: config.RedisHost,
        port: config.RedisPort,
        // password: 'hunminjungwook' 
      }
    }),
    JwtModule.register({
      secret: config.Secret,
      // signOptions:{expiresIn:'60s'}
    })
  ],
  controllers: [AppController, RoomController],
  providers: [{
    provide: APP_GUARD,
    useClass:  JwtAuthGuard
  },AppService, RoomService, RedisProvider, JwtService],
}) 
export class AppModule {}
