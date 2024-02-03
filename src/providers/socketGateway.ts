import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameRoomDTO } from 'src/room/DTO';
import { JwtService } from '@nestjs/jwt';
import { RoomService } from '../room/room.service';
import e from 'express';

interface InGameRoomInfo {
  creatorNickname: string;
  playersNickname: Set<string> | undefined;
  roomId: number;
  roomTitle: string;
  maxCount: number;
}

@WebSocketGateway(3001, {
  cors: {
    origin: '*', // 모든 도메인에서의 접근을 허용합니다. 실제 사용 시에는 보안을 위해 구체적인 도메인을 명시하는 것이 좋습니다.
    credentials: true, // 쿠키를 사용할 경우 true로 설정
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private jwtService: JwtService,
    private roomService: RoomService,
  ) { }

  @WebSocketServer()
  server: Server;
  rooms: Map<number, InGameRoomInfo> = new Map()

  verifyToken(client: Socket): Promise<string> {
    const {token:authToken} = client.handshake.auth
    const token = authToken.split(' ')
    try {
      if (token[0] !== 'Bearer') {
        throw new Error('토큰 형식이 맞지 않음.')
      }

      const { sub } = this.jwtService.verify(token[1])
      return sub;
    } catch (e) {
      client.emit('error', {
        message: 'Invalid token. Connection refused.',
        error: e.message
      });
      console.log('Socket Token Verify Error: ', e)
    }
  }

  isRoomThere(roomId: number): boolean {
    if (this.rooms.has(roomId)) {
      return true
    }
    return false
  }

  async handleConnection(client: Socket) {
    try {
      const nickname: string = await this.verifyToken(client);
      console.log(nickname, '어서 오시고~')
      client.data = {
        nickname,
        roomId: 0
      }
      client.join('Lobby');
    } catch (e) {
      client.disconnect()
    }
  }

  async handleDisconnect(client: Socket) {
    const { nickname, roomId } = client.data
    if (this.isRoomThere(roomId)) {
      this.rooms.get(roomId).playersNickname.delete(nickname);
      if (this.rooms.has(roomId)) {
        this.rooms.delete(roomId);
        await this.roomService.deleteRoom(roomId);
      }
    }
  }

  @SubscribeMessage('createRoom')
  async createRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: number },
  ) {
    const nickname = await this.verifyToken(client);
    const prevRoomInfo = await this.roomService.findOne(roomId)
    if (roomId !== prevRoomInfo.roomId || prevRoomInfo.creatorNickname !== nickname) {
      client.emit('error', '방 정보와 송신자 정보가 불일치함')
      return
    }
    client.data.roomId = roomId
    const roomInfo: InGameRoomInfo = {
      roomId,
      creatorNickname: prevRoomInfo.creatorNickname,
      roomTitle: prevRoomInfo.roomTitle,
      playersNickname: new Set([nickname]),
      maxCount: prevRoomInfo.maxCount
    }
    if (this.rooms.has(roomId)) {
      client.emit('error', '이미 방이 존재함.')
      return
    }
    this.rooms.set(roomId, roomInfo)
    client.join(`${roomId}`);
    client.emit('createRoom', { ...roomInfo, playersNickname: [nickname] });
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: number },
  ) {
    try {
      const nickname = await this.verifyToken(client);
      if (!nickname) {
        throw new Error("옳바른 토큰이 아님.")
      }
      const isRoom = this.isRoomThere(roomId)
      if (!isRoom) {
        throw new Error("joinUser: 방이 없음.")
      }
      if (this.rooms.has(roomId) && this.rooms.get(roomId).playersNickname.has(nickname)) {
        client.emit('error', {
          rooms: Array.from(this.rooms.get(roomId).playersNickname),
          mesage: 'joinUser 이미 들어와 있음',
        });
        return;
      }

      const roomInfo = this.rooms.get(roomId)
      const currCount = Array.from(roomInfo.playersNickname).length
      if(currCount >= roomInfo.maxCount ){
        throw new Error("인원 초과요~")
      }
      client.join(`${roomId}`);
      client.data.roomId = roomId
      roomInfo.playersNickname.add(nickname)      
      client.emit('roomInfo', { ...roomInfo, playersNickname: Array.from(roomInfo.playersNickname) });
      this.server.to(`${roomId}`).emit('joinUser', Array.from(roomInfo.playersNickname));

    } catch (e) {
      client.emit('error', e.message)
    }
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: number },
  ) {
    const nickname = await this.verifyToken(client);
    const isRoom = this.rooms.has(roomId)
    const hasRoomNickname = this.rooms.get(roomId).playersNickname.has(nickname)
    if (!isRoom) {
      client.emit('error', "방이 존재하지 않음.")
      return
    }
    if (!hasRoomNickname || client.data.roomId !== roomId) {
      client.emit('error', '유저가 방에 존재하지 않음.');
      return;
    }
    client.leave(`${roomId}`);
    client.data.roomId = 0
    const roomInfo = this.rooms.get(roomId)
    roomInfo.playersNickname.delete(nickname);
    
    if (this.rooms.get(roomId).playersNickname.size === 0) {
      this.rooms.delete(roomId);
      await this.roomService.deleteRoom(roomId);
      client.emit('leave', '방 삭제');
    } 
    
    // 나간 유저가 방장(creatorNickname)이면 방장 변경.
    if(nickname === roomInfo.creatorNickname){
      const players = Array.from(roomInfo.playersNickname)
      const randomUser = players[Math.floor(Math.random() * players.length)]
      const result = await this.roomService.changeCreator(roomId, randomUser)
      if (!result){
        return
      }
      roomInfo.creatorNickname = randomUser
    }

    client.join('lobby');
    this.server.to(`${roomId}`).emit('leave', {...roomInfo, playersNickname: Array.from(roomInfo.playersNickname)});
  }

  @SubscribeMessage('modifyRoomInfo')
  async modifyRoomInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() newRoomInfo: GameRoomDTO,
  ) {
    const nickname = await this.verifyToken(client);
    const { roomId } = client.data
    const { creatorNickname } = await this.roomService.findOne(roomId)
    if (nickname !== creatorNickname) {
      client.emit('error', '방장이 아님')
      return
    }
    const resultInfo = await this.roomService.modifyRoomInfo(roomId, newRoomInfo);
    this.server.to(`${roomId}`).emit('modifyRoomInfo', resultInfo);
  }
}
