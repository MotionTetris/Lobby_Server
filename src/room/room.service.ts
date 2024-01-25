import { Injectable } from '@nestjs/common';
import { GameRoomDTO } from './DTO';
import { Redis, RedisKey } from 'ioredis';
import { RedisProvider } from 'providers';

@Injectable()
export class RoomService {

    private readonly redisClient: Redis;

    constructor(
        private RedisProvider: RedisProvider,
    ) {
        this.redisClient = this.RedisProvider.getClient()
    }

    async findAll(): Promise<GameRoomDTO[]> {
        const keys: RedisKey[] = [];
        const values:GameRoomDTO[]|"" = [];
        const targets = await this.redisClient.keys('Room:*')
        keys.push(...targets)

        for (const key of keys) {
            const value:GameRoomDTO = JSON.parse(await this.redisClient.get(key))
            if (value) {
                values.push(value)
            } else {
                values.push(value)
            }
        }
        return values;
    }

    async findOne(roomNum: number): Promise<GameRoomDTO> {
        const result = await this.redisClient.get(`Room:${roomNum}`)

        if (!result) throw new Error(`${roomNum}Room Not Found`)

        return JSON.parse(result)
    }

    async createRoom(roomInfo: GameRoomDTO): Promise<number> {
        let roomNumber = 1;
        // 사용 중인 방 번호들을 가져옵니다.
        const occupiedRooms = await this.redisClient.smembers('occupiedRooms');
        const occupiedSet = new Set(occupiedRooms.map(num => parseInt(num)));

        // 사용 가능한 가장 낮은 방 번호를 찾습니다.
        while (occupiedSet.has(roomNumber)) {
            roomNumber++;
        }
        roomInfo["RoomNumber"] = roomNumber
        // 새 방 정보를 Redis에 저장합니다.
        const roomKey = `Room:${roomNumber}`;
        const tx_result = await this.redisClient.multi()
            .sadd('occupiedRooms', roomNumber) // 방 번호를 사용 중인 목록에 추가합니다.
            .set(roomKey, JSON.stringify(roomInfo)) // 방 정보를 저장합니다.
            .exec();

        if (!tx_result || tx_result.some(result => result === null)) {
            throw new Error('Room Creation Failed.');
        }
        
        return roomNumber;
    }

    async modifyRoomInfo(roomNum: number, payload: GameRoomDTO): Promise<GameRoomDTO | boolean> {
        const result = await this.redisClient.set(`Room:${roomNum}`, JSON.stringify(payload))
        if (result == 'OK') {
            return payload
        }
        // throw new Error("")
    }

    async deleteRoom(roomNum: number): Promise<boolean> {
        const roomKey = `Room:${roomNum}`;

        // Redis 트랜잭션 시작
        const transaction = this.redisClient.multi();
        transaction.del(roomKey);

        // 사용 중인 방 번호 목록에서 해당 번호 제거
        transaction.srem('occupiedRooms', roomNum.toString());

        // 트랜잭션 실행
        const tx_result = await transaction.exec();

        // 트랜잭션 결과 검증
        // 실패 했거나 result 배열에 null이 포함될 경우(뭔가 하나라도 실패했을 시)
        // atomic을 이용한 처리
        if (!tx_result || tx_result.some(result => result === null)) {
            throw new Error('Room Deletion Failed');
        }

        return true;
    }
}
