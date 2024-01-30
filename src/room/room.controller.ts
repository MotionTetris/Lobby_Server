import { Body, Controller, Get, Post } from '@nestjs/common';
import { GameRoomDTO } from './DTO';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  async getRoomList(): Promise<GameRoomDTO[]> {
    return await this.roomService.findAll();
  }

  //   @Get('/:roomId')
  //   async getRoom(@Param('roomId') roomNum: number): Promise<IMessage> {
  //     const result = await this.roomService.findOne(roomNum);
  //     return result;
  //   }

  @Post()
  async newRoom(@Body() roomInfo: GameRoomDTO): Promise<string> {
    return await this.roomService.createRoom(roomInfo);
  }

  //   @Put('/:roomId')
  //   async modifyRoomInfo(
  //     @Param('roomId') roomId: number,
  //     @Body() payload: GameRoomDTO,
  //   ): Promise<boolean | GameRoomDTO> {
  //     const result = await this.roomService.modifyRoomInfo(roomId, payload);
  //     if (result == 'OK') {
  //       this.appGateway.modifyRoomInfo(roomId, payload);
  //       return payload;
  //     }
  //   }

  //   @Delete('/:roomId')
  //   async delRoom(@Param('roomId') roomId: number): Promise<void> {
  //     await this.roomService.deleteRoom(roomId);
  //   }
}
