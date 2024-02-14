import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisProvider } from './providers';

@Injectable()
export class AppService implements OnModuleDestroy {
  private readonly redisClient: Redis;
  constructor(private redisProvider: RedisProvider) {
    this.redisClient = redisProvider.getClient();
  }

  getHello(): string {
    return 'Hello World!!!';
  }

  onModuleDestroy() {
    console.log('서버 종료. Redis 데이터 삭제 중...');
    this.redisClient.flushall((err, succeeded) => {
      console.log('Redis FLUSHALL 실행 결과:', succeeded);
    });
  }
}
