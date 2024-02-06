import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
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
  async newRoom(
    @Req() req: Request,
    @Body() roomInfo: GameRoomDTO,
  ): Promise<IMessage> {
    const token = req.headers.authorization.split(' ')[1];
    return await this.roomService.createRoom(token, roomInfo);
  }
}
