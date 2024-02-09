import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameRoomDTO } from 'src/room/DTO';
import { JwtService } from '@nestjs/jwt';
import { RoomService } from '../room/room.service';
import { RoomManager } from 'src/providers/room.manager';
import { emit } from 'process';

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
      const { token: authToken } = client.handshake.auth;
      if (!authToken.startsWith('Bearer ')) throw new Error('Invalid token format.');
      const { sub: nickname } = this.jwtService.verify(authToken.split(' ')[1]);
      return nickname;
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
      console.error(err)
      client.emit('error',err.message)
      client.disconnect();
    }
  }

  async handleDisconnect(client:Socket){
    try{
      const {nickname, userRoom} = client.data;
      this.roomManger.removePlayerFromRoom(userRoom, nickname)
      console.log(nickname,'연결 끊김.')
    }catch(err){
      console.error(err);
      client.emit('error',err.message)
    }
  }

  @SubscribeMessage('createRoom')
  async createRoom(
    @ConnectedSocket() client:Socket,
    @MessageBody() {roomId}:{roomId:number}
  ){
    try{
      const nickname = await this.verifyToken(client);
      const roomInfo = await this.roomManger.createRoomInfo(roomId, nickname, client);
      client.data.userRoom = roomId;
      const DTO = this.roomManger.changeToDTO(roomInfo);
      if (this.roomManger.getRoom(roomId)) {
        client.emit('error', '이미 방이 존재함.');
        return;
      }

      this.roomManger.createRoom(roomId, roomInfo);
      client.join(`${roomId}`);
      client.emit('createRoom',DTO);
      if(roomInfo.maxCount===1){
        client.emit('allReady', true);
      }  
    }catch(err){
      console.error(err);
      client.emit('error',err.message);
    }
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client:Socket,
    @MessageBody() {roomId}:{roomId:number}
  ){
    try{
      const nickname = await this.verifyToken(client);
      const roomInfo = this.roomManger.getRoom(roomId);
      console.log('방 상태 생성 되었나??',roomInfo)
      if(roomInfo){
        throw new Error('joinUser: 방이 없음');
      }

      if(roomInfo.playersNickname.has(nickname)){
        client.emit('error', {
          rooms: Array.from(roomInfo.playersNickname),
          mesage: 'joinUser 이미 들어와 있음',
        });
        client.emit('allReady',true);
        return;
      }

      const currCount = Array.from(roomInfo.playersNickname).length;
      if(currCount >= roomInfo.maxCount){
        throw new Error('인원 초과요~');
      }

      client.join(`${roomId}`);
      client.data.userRoom = roomId;
      this.roomManger.addPlayerToRoom(roomId, nickname);
      const DTO = this.roomManger.changeToDTO(roomInfo);
      client.emit('roomInfo',DTO);
      this.server.to(`${roomId}`).emit('joinUser', DTO.playersNickname);
    }catch(err){
      console.error(err);
      client.emit('error',err.message);
    }
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client:Socket,
    @MessageBody() {roomId}:{roomId:number}
  ){
    try{
      const nickname = await this.verifyToken(client);
      const roomInfo = this.roomManger.getRoom(roomId);
      if(!roomInfo){
        client.emit('error','방이 없음')
      }
      if(!roomInfo.playersNickname.has(nickname) || client.data.userRoom !== roomId){
        throw new Error('방에 유저가 존재하지 않음.');
      }
      this.roomManger.removePlayerFromRoom(roomId, nickname)
      client.leave(`${roomId}`);
      client.data.userRoom = 0;
      const DTO = this.roomManger.changeToDTO(roomInfo);
      if (DTO.playersNickname.length>=1 && nickname === roomInfo.creatorNickname[0]){
        this.roomManger.changeCreator(roomInfo, nickname);
      }
      client.join('lobby');
      this.server.to(`${roomId}`).emit('leave',DTO);
    }catch(err){
      client.emit('error',err.message);
    }
  }

  @SubscribeMessage('modifyRoomInfo')
  async modifyRoomInfo(
    @ConnectedSocket() client:Socket,
    @MessageBody() newRoomInfo: GameRoomDTO,
  ){
    const nickname = await this.verifyToken(client);
    const {userRoom} = client.data;
    const {creatorNickname} = await this.roomService.findOne(userRoom);
    if(nickname !== creatorNickname){
      client.emit('error','방장이 아님');
    }
    const resultInfo = this.roomManger.updateRoom(userRoom, nickname, newRoomInfo);
    if(resultInfo){
      this.server.to(`${userRoom}`).emit('modifyRoomInfo', resultInfo);
    }
  }

  @SubscribeMessage('gameReady')
  gameReady(
    @ConnectedSocket() client:Socket,
    @MessageBody() {roomId}:{roomId: number}
  ){
    const {nickname, userRoom} = client.data;
    const isSame = userRoom === roomId;
    let room:InGameRoomInfo;
    if(isSame){
      room = this.roomManger.getRoom(roomId);
      room.readyUsers.add(nickname);
    }
    if (room.readyUsers.size === room.maxCount) {
      const creatorSocket = room.creatorNickname[1];
      const socket = this.server.sockets.sockets.get(creatorSocket);
      socket.emit('allReady',true);
    }
  }

  @SubscribeMessage('gameStart')
  gameStart(
    @ConnectedSocket() client:Socket
  ){
    const {userRoom, nickname} = client.data;
    const room = this.roomManger.getRoom(userRoom);
    if(nickname !== room.creatorNickname[0]){
      console.log('방장이 아님');
      client.emit('error','방장이 아닌디~')
      return
    }
    this.server.to(`${userRoom}`).emit('gameStart',true)
  }
}
