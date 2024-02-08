// room-manager.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class RoomManager {
  private rooms: Map<number, InGameRoomInfo> = new Map();

  createRoom(roomId: number, roomInfo: InGameRoomInfo): void {
    this.rooms.set(roomId, roomInfo);
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

  getRoom(roomId: number): InGameRoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  updateRoom(roomId: number, updatedInfo: Partial<InGameRoomInfo>): void {
    const room = this.getRoom(roomId);
    if (room) {
      const updatedRoom = { ...room, ...updatedInfo };
      this.rooms.set(roomId, updatedRoom as InGameRoomInfo);
    }
  }

  addPlayerToRoom(roomId: number, playerName: string): void {
    const room = this.getRoom(roomId);
    if (room) {
      room.playersNickname.add(playerName);
    }
  }

  removePlayerFromRoom(roomId: number, playerName: string): boolean {
    const room = this.getRoom(roomId);
    if (room) {
      room.playersNickname.delete(playerName);
      if (room.playersNickname.size === 0) {
        this.deleteRoom(roomId);
        return true
      }
    }
    return false
  }

  isRoomExist(roomId: number): boolean {
    return this.rooms.has(roomId);
  }
}
