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

interface UserStatus {
  socketId: string;
  status: string;
  roomId: number;
}

interface StatusInGame {}

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
  ) {}

  @WebSocketServer()
  server: Server;
  lobbyUser: Set<string> = new Set();
  // rooms: { [roomId: number]: Set<string> } = {};
  rooms: Map<number, Set<string>> = new Map()
  user: { [nickname: string]: UserStatus } = {};
  // user: Map<string, UserStatus> = new Map();
  sockets: Map<string, string> = new Map();
  statusInGame: Map<string, StatusInGame> = new Map();

  async verifyToken(client: Socket): Promise<string> {
    const token = client.handshake.headers.authorization?.split(' ')[1];
    // return this.jwtService.verify(token)
    try {
      const { nickname } = await this.jwtService.decode(token);
      return nickname;
    } catch (e) {
      client.emit('error', 'Invalid token. Connection refused.');
      client.disconnect();
    }
  }

  isRoomThere(roomId:number):boolean{
    if(this.rooms.has(roomId)){
      return true
    }
    return false
  }

  private restoreUserState(client: Socket, nickname: string) {
    const { status, roomId } = this.user[nickname];
    if (status == 'Lobby') {
      client.join(status);
    } else {
      const gameStatus = this.statusInGame.get(nickname);
      client.join(`${roomId}`);
      client.emit('restoreState', gameStatus);
      this.server
        .to(`${roomId}`)
        .emit('userRejoin', `${nickname}님이 다시 연결되었습니다.`);
    }
  }

  async handleConnection(client: Socket) {
    // const decoded = this.jwtService.verify(token)
    const nickname: string = await this.verifyToken(client);
    const socketId = this.sockets.get(nickname);
    if (socketId) {
      this.restoreUserState(client, nickname);
    } else {
      this.sockets.set(nickname, client.id);
      this.sockets.set(client.id, nickname);
      this.lobbyUser.add(nickname);
      this.user[nickname] = { socketId: nickname, status: 'Lobby', roomId: 0 };
      client.join('Lobby');
    }
  }

  async handleDisconnect(client: Socket) {
    const nickname = await this.verifyToken(client);
    const userStatus = this.user[nickname];
    if (userStatus) {
      this.lobbyUser.delete(nickname);
      if (userStatus.roomId && this.isRoomThere(userStatus.roomId)) {
        this.rooms.get(userStatus.roomId).delete(nickname);
        if (this.rooms.get(userStatus.roomId)?.size === 0) {
          this.rooms.delete(userStatus.roomId);
          await this.roomService.deleteRoom(userStatus.roomId);
        }
      }
      delete this.user[client.id];
    }
  }

  @SubscribeMessage('createRoom')
  async createRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: number },
  ) {
    const nickname = await this.verifyToken(client);
    this.lobbyUser.delete(nickname);
    this.user[nickname].roomId = roomId;
    this.rooms.set(roomId, new Set<string>());
    this.rooms.get(roomId).add(nickname);
    client.join(`${roomId}`);
    client.emit('createRoom', Array.from(this.rooms.get(roomId)));
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: number },
  ) {
    const nickname = await this.verifyToken(client);
    const isRoom = this.isRoomThere(roomId)
    if(!isRoom){
      client.emit('joinUser','방이 없음.')
      return
    }
    if (this.rooms.get(roomId).has(nickname)) {
      client.emit('joinUser', {
        rooms: Array.from(this.rooms.get(roomId)),
        mesage: '이미 들어와 있음',
      });
      return;
    }
    this.lobbyUser.delete(nickname);
    this.user[nickname].roomId = roomId;
    this.rooms.get(roomId)?.add(nickname);
    client.join(`${roomId}`);
    const roomInfo = await this.roomService.joinRoom(roomId, nickname);
    client.emit('roomInfo', roomInfo);
    this.server.to(`${roomId}`).emit('joinUser', Array.from(this.rooms.get(roomId)));
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: number },
  ) {
    const nickname = await this.verifyToken(client);
    const isRoom = this.isRoomThere(roomId)
    const hasRoomNickname = this.rooms.get(roomId).has(nickname)
    if(!isRoom){
      client.emit('leave',"방이 존재하지 않음.")
      return
    }
    if ( !hasRoomNickname) {
      client.emit('leave', '방에 존재하지 않음.');
      return;
    }
    client.leave(`${roomId}`);
    this.rooms.get(roomId).delete(nickname);
    if (this.rooms.get(roomId).size === 0) {
      this.rooms.delete(roomId);
      await this.roomService.deleteRoom(roomId);
      client.emit('leave', '방 삭제');
    } else {
      const roomInfo = await this.roomService.leaveRoom(roomId, nickname);
      client.join('lobby');
      this.server.to(`${roomId}`).emit('leave', roomInfo);
    }
  }

  @SubscribeMessage('modifyRoomInfo')
  async modifyRoomInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomInfo: GameRoomDTO,
  ) {
    await this.verifyToken(client);
    const resultInfo = await this.roomService.modifyRoomInfo(roomInfo);
    const { roomId } = roomInfo;
    this.server.to(`${roomId}`).emit('modifyRoomInfo', resultInfo);
  }
}
