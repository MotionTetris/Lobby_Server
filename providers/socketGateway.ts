import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { GameRoomDTO } from 'src/room/DTO';

@WebSocketGateway()
export class AppGateway {
    
  @WebSocketServer()
  server: Server;

  broadcastEvent(data: GameRoomDTO) {
    this.server.emit('message', data);
  }

//   @SubscribeMessage("Event name")
//   funcName(){

//   }
}