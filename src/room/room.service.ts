import { Injectable } from '@nestjs/common';
import { GameRoomDTO } from './DTO';
import { Redis } from 'ioredis';
import { RedisProvider } from 'src/providers';
import { IMessage } from './DTO/message';
import * as bcrypt from 'bcrypt';
import { ResponseRoomInfo } from './DTO/ResponstRoomInfo';

@Injectable()
export class RoomService {
  private readonly redisClient: Redis;
  constructor(private RedisProvider: RedisProvider) {
    this.redisClient = this.RedisProvider.getClient();
  }

  async findAll(): Promise<GameRoomDTO[]> {
    const keys = await this.redisClient.keys('Room:*');
    const rooms = await Promise.all(
      keys.map((key) => this.redisClient.get(key)),
    );
    return rooms.filter(Boolean).map((room) => JSON.parse(room as string));
  }

  async findOne(roomId: number): Promise<GameRoomDTO> {
    const result = await this.redisClient.get(`Room:${roomId}`);

    if (!result) {
      throw new Error(`${roomId}Room Not Found`);
    }

    return JSON.parse(result)
  }

  async joinRoom(roomId:number, nickname:string):Promise<ResponseRoomInfo>{
    const roomInfo = await this.findOne(roomId);
    roomInfo.players.push(nickname)
    const result = await this.modifyRoomInfo(roomInfo)
    return result
  }

  async leaveRoom(roomId:number, nickname:string):Promise<ResponseRoomInfo>{
    const roomInfo = await this.findOne(roomId)
    const {players} = roomInfo
    const index = players.indexOf(nickname)
    if(index !== -1){
        players.splice(index,1)
    }
    roomInfo.players = players
    const result = await this.modifyRoomInfo(roomInfo)
    return result
  }

  async createRoom(roomInfo: GameRoomDTO): Promise<string> {
    let roomId = 1;

    if (roomInfo.password) {
      const hashedPassword = await bcrypt.hash(roomInfo.password, 10);
      roomInfo.password = hashedPassword;
    }

    // 사용 중인 방 번호들을 가져오기
    const occupiedRooms = await this.redisClient.smembers('occupiedRooms');
    const occupiedSet = new Set(occupiedRooms.map((num) => parseInt(num)));

    // 사용 가능한 가장 낮은 방 번호를 찾기
    while (occupiedSet.has(roomId)) {
      roomId++;
    }
    roomInfo['roomId'] = roomId;

    // 새 방 정보를 Redis에 저장합니다.
    const roomKey = `Room:${roomId}`;
    const tx_result = await this.redisClient
      .multi()
      .sadd('occupiedRooms', roomId) // 방 번호를 사용 중인 목록에 추가
      .set(roomKey, JSON.stringify(roomInfo)) // 방 정보를 저장
      .exec();

    if (tx_result.some((result) => result === null)) {
      throw new Error('Room Creation Failed.');
    }

    return roomId.toString();
  }

  async modifyRoomInfo(payload: GameRoomDTO): Promise<ResponseRoomInfo> {
    const { roomId } = payload;
    const roomData = await this.redisClient.get(`Room:${roomId}`);
    if (!roomData) throw new Error(`Room ${roomId} not found`);

    const roomInfo = JSON.parse(roomData);
    // 보낸사람이 방장인가?
    if (roomInfo.owner !== payload.owner) {
      throw new Error('Only the room owner can modify room information');
    }
    // 수정될 비밀번호가 있으면, 변경된 것 해쉬화 후 저장 비밀번호가 안왔으면 그대로.
    if (payload.password) {
      const hashedPassword = await bcrypt.hash(payload.password, 10);
      roomInfo.password = hashedPassword; // 업데이트된 비밀번호 적용
    }
    const resultInfo = { ...roomInfo, ...payload };

    const result = await this.redisClient.set(
      `Room:${roomId}`,
      JSON.stringify(resultInfo),
    );

    if (result !== 'OK') {
      throw new Error(`Failed to update Room ${roomId}`);
    }
    delete resultInfo['password'];
    return resultInfo;
  }

  async deleteRoom(roomId: number): Promise<void> {
    const roomKey = `Room:${roomId}`;

    // 트랜잭션 실행
    const txResult = await this.redisClient
      .multi()
      .del(roomKey)
      .srem('occupiedRooms', roomId.toString())
      .exec();

    // 트랜잭션 결과 검증
    // 실패 했거나 result 배열에 null이 포함될 경우(뭔가 하나라도 실패했을 시)
    // atomic을 이용한 처리
    if (!txResult || txResult.some((result) => result === null)) {
      throw new Error('Room Deletion Failed');
    }
  }
}
