import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { GameRoomDTO } from './DTO';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
    constructor(
        private readonly roomService:RoomService,
    ){}

    @Get()
    async getRoomList():Promise<GameRoomDTO[]>{
        return await this.roomService.findAll();
    }
    @Get('/:roomNum')
    async getRoom(@Param('roomNum') roomNum:number):Promise<GameRoomDTO>{
        return await this.roomService.findOne(roomNum);
    }

    @Post()
    async newRoom(@Body() roomInfo:GameRoomDTO):Promise<number>{
        return await this.roomService.createRoom(roomInfo);
    }

    @Put('/:roomNum')
    async modifyRoomInfo(@Param('roomNum') roomNum:number, @Body() payload:GameRoomDTO):Promise<boolean | GameRoomDTO>{
        return await this.roomService.modifyRoomInfo(roomNum, payload)
    }

    @Delete('/:roomNum')
    async delRoom(@Param('roomNum') roomNum:number):Promise<boolean>{
        return await this.roomService.deleteRoom(roomNum)
    }
}

// GameRoomDTO{
//     title:string;
//     status:"Ready"|"Start";
//     isLock:"Lock"|"UnLock";
//     players:string[];
// }
