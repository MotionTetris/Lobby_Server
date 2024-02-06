import { Module, Global } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { JwtAuthGuard } from 'src/providers';
import { JwtModule } from '@nestjs/jwt';
import config from '../config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AllExceptionsFilter } from 'src/exception/exception.filter';
import { RoomModule } from './room/room.module';

@Global()
@Module({
  imports: [
    RoomModule,
    RedisModule.forRoot({
      readyLog: true,
      config: {
        host: config.RedisHost,
        port: config.RedisPort,
        // password: 'hoonminjungwook'
      },
    }),
    JwtModule.register({
      secret: `${config.Secret}`,
      signOptions: { expiresIn: '600s' },
    }),

    ConfigModule.forRoot(),
    RoomModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    AppService,
  ],
  exports: [JwtModule],
})
export class AppModule {}
