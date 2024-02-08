import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameRoomDTO } from 'src/room/DTO';
import { JwtService } from '@nestjs/jwt';
import { RoomService } from '../room/room.service';
import { RoomManager } from 'src/providers/room.manager';

@WebSocketGateway(3001, {
  cors: {
    origin: '*',
    credentials: true,
  },
})

export class LobbyGateway {

  constructor(
    private jwtService: JwtService,
    private roomService: RoomService,
    private roomManger: RoomManager
  ) { }

  @WebSocketServer()
  server: Server;

  async verifyToken(client: Socket): Promise<string> {
    try {
      const { token: authToken } = client.handshake.auth;
      if (!authToken.startsWith('Bearer ')) throw new Error('Invalid token format.');
      const { sub: nickname } = this.jwtService.verify(authToken.split(' ')[1]);
      return nickname;
    } catch (err) {
      console.error('Token verification Error:', err);
      client.emit('error',err);
      return null;
    }
  }

  async handleConnection(client:Socket){
    try{
      const nickname:string = await this.verifyToken(client);
      console.log(nickname,'님 입장 하십니다~');
      client.data = {
        nickname,
        userRoom:0
      };
      client.join('Lobby');
    }catch(err){
      client.disconnect();
    }
  }

  async handleDisconnect(client:Socket){
    const {nickname, userRoom} = client.data;
    const isRoomDelete = this.roomManger.removePlayerFromRoom(userRoom, nickname)
    if(isRoomDelete){
      await this.roomService.deleteRoom(userRoom)
    }
  }

  @SubscribeMessage('createRoom')
  async createRoom(
    @ConnectedSocket() client:Socket,
    @MessageBody() {roomId}:{roomId:number}
  ){
    const nickname = await this.verifyToken(client)
    const prevRoomInfo = await this.roomService.findOne(roomId)

    if (
      roomId !== prevRoomInfo.roomId ||
      prevRoomInfo.creatorNickname !== nickname
    ) {
      client.emit('error', '방 정보와 송신자 정보가 불일치함');
      return;
    }
    const roomInfo: InGameRoomInfo = {
      roomId:roomId,
      creatorNickname: [prevRoomInfo.creatorNickname,client.id],
      roomTitle: prevRoomInfo.roomTitle,
      playersNickname: new Set([nickname]),
      maxCount: prevRoomInfo.maxCount,
      readyUsers: new Set([nickname]),
    };
    client.data.userRoom = roomId;
    const DTO = this.roomManger.changeToDTO(roomInfo);
    if (this.roomManger.getRoom(roomId)) {
      client.emit('error', '이미 방이 존재함.');
      return;
    }


  }
}
