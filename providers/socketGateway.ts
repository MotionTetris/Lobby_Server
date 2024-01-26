import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { GameRoomDTO } from 'src/room/DTO';

@WebSocketGateway({
    cors: {
      origin: '*', // 모든 도메인에서의 접근을 허용합니다. 실제 사용 시에는 보안을 위해 구체적인 도메인을 명시하는 것이 좋습니다.
      credentials: true, // 쿠키를 사용할 경우 true로 설정
    }
  })
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