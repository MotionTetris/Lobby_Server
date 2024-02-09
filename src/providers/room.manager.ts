// room-manager.service.ts

import { Injectable } from '@nestjs/common';
import { GameRoomDTO, RES_GameRoomDTO } from 'src/room/DTO';
import { RoomService } from 'src/room/room.service';

@Injectable()
export class RoomManager {
  private rooms: Map<number, InGameRoomInfo> = new Map();

  constructor(
    private roomService:RoomService
  ){}

  createRoom(roomId: number, roomInfo: InGameRoomInfo): void {
    this.rooms.set(roomId, roomInfo);
  }

  async createRoomInfo(roomId:number, nickname:string, client):Promise<InGameRoomInfo>{
    const prevRoomInfo = await this.roomService.findOne(roomId);
  
      if (
        roomId !== prevRoomInfo.roomId ||
        prevRoomInfo.creatorNickname !== nickname
      ) {
        throw new Error('방 정보 불일치. 방장이 다름.');
      }

      const roomInfo: InGameRoomInfo = {
        roomId:roomId,
        creatorNickname: [prevRoomInfo.creatorNickname,client.id],
        roomTitle: prevRoomInfo.roomTitle,
        playersNickname: new Set([nickname]),
        maxCount: prevRoomInfo.maxCount,
        readyUsers: new Set([nickname]),
      };

      return roomInfo
  }

  changeToDTO(data:InGameRoomInfo){
    return {
      ...data, 
      playersNickname: Array.from(data.playersNickname), 
      readyUser: Array.from(data.readyUsers)
    }
  }

  deleteRoom(roomId: number): boolean {
    return this.rooms.delete(roomId);
  }

  async changeCreator(roomInfo:InGameRoomInfo, nickname:string): Promise<void> {
    const players = Array.from(roomInfo.playersNickname);
    const randomUser = players[Math.floor(Math.random() * players.length)];
    const result = await this.roomService.changeCreator(roomInfo.roomId, randomUser);
    if (!result) {
      return;
    }
    roomInfo.creatorNickname[0] = randomUser;
  }

  getRoom(roomId: number): InGameRoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  async updateRoom(userRoom: number, nickname:string, updatedInfo: GameRoomDTO): Promise<RES_GameRoomDTO|null> {
    const roomInfo = await this.roomService.findOne(userRoom);
    if (nickname !== roomInfo.creatorNickname) {
      throw new Error('방장이 아님');
    }
    if (roomInfo) {
      const updatedRoom = { ...roomInfo, ...updatedInfo };
      const resultInfo = await this.roomService.modifyRoomInfo(userRoom, updatedRoom);
      return resultInfo
    }
    return null

  }

  addPlayerToRoom(roomId: number, playerName: string): void {
    const room = this.getRoom(roomId);
    if (room) {
      room.playersNickname.add(playerName);
    }
  }

  removePlayerFromRoom(roomId: number, playerName: string): void {
    const room = this.getRoom(roomId);
    if (room) {
      room.playersNickname.delete(playerName);
      if (room.playersNickname.size === 0) {
        this.deleteRoom(roomId);
        this.roomService.deleteRoom(roomId);
        console.log(roomId,'번 방 삭제');
      }
    }else{
      throw new Error(`${roomId}번 방이 존재하지 않음.`);
    }
  }
}
