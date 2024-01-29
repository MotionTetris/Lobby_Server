import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { GameRoomDTO } from './DTO';
import { RoomService } from './room.service';
import { AppGateway } from '../../providers'
import { IMessage } from './DTO/message';

@Controller('room')
export class RoomController {
    constructor(
        private readonly roomService:RoomService,
        private appGateway:AppGateway
    ){}

    @Get()
    async getRoomList():Promise<GameRoomDTO[]>{
        return await this.roomService.findAll();
    }

    @Get('/:roomId')
    async getRoom(@Param('roomId') roomNum:number):Promise<IMessage>{
        const result = await this.roomService.findOne(roomNum);
        if(result.Code == "200"){
            // this.appGateway.broadcastEvent(result.Message)
        }
        return result
    }

    @Post()
    async newRoom(@Body() roomInfo:GameRoomDTO):Promise<number>{
        return await this.roomService.createRoom(roomInfo);
    }

    @Put('/:roomId')
    async modifyRoomInfo(@Param('roomId') roomId:number, @Body() payload:GameRoomDTO):Promise<boolean | GameRoomDTO>{
        const result = await this.roomService.modifyRoomInfo(roomId, payload)
        if (result == 'OK') {
            this.appGateway.modifyRoomInfo(roomId,payload)
            return payload
        }
        return false
    }

    @Delete('/:roomId')
    async delRoom(@Param('roomId') roomId:number):Promise<void>{
        await this.roomService.deleteRoom(roomId)
    }
}

// GameRoomDTO{
//     title:string;
//     status:"Ready"|"Start";
//     isLock:"Lock"|"UnLock";
//     players:string[];
// }
