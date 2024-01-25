import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomController } from './room/room.controller';
import { RoomService } from './room/room.service';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AppGateway, RedisProvider, JwtAuthGuard } from 'providers';
import { JwtModule } from '@nestjs/jwt'
import config from '../config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config'
import { AllExceptionsFilter } from 'exception/exception.filter';

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
    }),
   ConfigModule.forRoot()
  ],
  controllers: [AppController, RoomController],
  providers: [
    {
  //   provide: APP_GUARD,
  //   useClass:  JwtAuthGuard
  // },{
    provide: APP_FILTER,
    useClass: AllExceptionsFilter,
  },AppService, RoomService, RedisProvider, JwtService, AppGateway],
}) 
export class AppModule {}
