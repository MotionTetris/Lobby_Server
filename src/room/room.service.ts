import { Delete, Get, Injectable, Post, Put } from '@nestjs/common';
import { GameRoomDTO } from './DTO';
import { Redis, RedisKey } from 'ioredis';
import { RedisProvider } from 'providers';
import { threadId } from 'worker_threads';

let roomNum: number = 1
@Injectable()
export class RoomService {

    private readonly redisClient: Redis;

    constructor(
        private RedisProvider: RedisProvider,
    ) {
        this.redisClient = this.RedisProvider.getClient()
    }

    async findAll(): Promise<GameRoomDTO[]> {
        let keys = [];
        const values = [];
        const targets = await this.redisClient.keys('Room:*')
        keys.push(...targets)

        for (const key of keys) {
            const value = await this.redisClient.get(key);
            if(value) {
                values.push(JSON.parse(value))
            }else {
                values.push(value)
            }
        }
        return values;
    }

    async findOne(roomNum: number): Promise<GameRoomDTO> {
        const result = await this.redisClient.get(`Room:${roomNum}`)
        return JSON.parse(result)
    }

    async createRoom(roomInfo: GameRoomDTO): Promise<string> {
        const result = await this.redisClient.set(`Room:${roomNum++}`, JSON.stringify(roomInfo))
        console.log(result)
        return result
    }

    async modifyRoomInfo(roomNum: number, payload: GameRoomDTO): Promise<GameRoomDTO> {

        return
    }

    async deleteRoom(roomNum: number): Promise<boolean> {
        const result = await this.redisClient.del(`Room:${roomNum}`)
        console.log(result)
        return result
    }
}
