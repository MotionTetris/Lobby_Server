// redis.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class RedisProvider {
  constructor(@InjectRedis() private readonly redisClient: Redis) {}

  getClient(): Redis {
    return this.redisClient;
  }
}
