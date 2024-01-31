import { Body, Controller, Get, Post } from '@nestjs/common';
import { GameRoomDTO, IMessage } from './DTO';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  async getRoomList(): Promise<GameRoomDTO[]> {
    return await this.roomService.findAll();
  }

  @Post()
  async newRoom(@Body() roomInfo: GameRoomDTO): Promise<IMessage> {
    return await this.roomService.createRoom(roomInfo);
  }
}
