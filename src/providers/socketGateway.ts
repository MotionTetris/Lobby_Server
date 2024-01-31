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
  rooms: { [roomId: number]: Set<string> } = {};
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
      if (userStatus.roomId && this.rooms[userStatus.roomId]) {
        this.rooms[userStatus.roomId].delete(nickname);
        if (this.rooms[userStatus.roomId].size === 0) {
          delete this.rooms[userStatus.roomId];
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
    this.rooms[roomId] = new Set();
    this.rooms[roomId].add(nickname);
    client.join(`${roomId}`);
    client.emit('createRoom', Array.from(this.rooms[roomId]));
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: number,
  ) {
    const nickname = await this.verifyToken(client);
    if (this.rooms[roomId]?.has(nickname)) {
      client.emit('joinUser', {
        rooms: Array.from(this.rooms[roomId]),
        mesage: '이미 들어와 있음',
      });
      return;
    }
    this.lobbyUser.delete(nickname);
    this.user[nickname].roomId = roomId;
    this.rooms[roomId].add(nickname);
    client.join(`${roomId}`);
    const roomInfo = await this.roomService.joinRoom(roomId, nickname);
    client.emit('roomInfo', roomInfo);
    this.server.to(`${roomId}`).emit('joinUser', [...this.rooms[roomId]]);
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: number },
  ) {
    const nickname = await this.verifyToken(client);
    if (!this.rooms[roomId]?.has(nickname)) {
      client.emit('leave', '방에 존재하지 않음.');
      return;
    }
    client.leave(`${roomId}`);
    this.rooms[`${roomId}`]?.delete(nickname);
    if (!this.rooms[roomId]) {
      delete this.rooms[roomId];
      await this.roomService.deleteRoom(roomId);
      client.emit('leave', '방 삭제');
    } else {
      const roomInfo = await this.roomService.leaveRoom(roomId, nickname);
      client.join('lobby');
      client.emit('leave', roomInfo);
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
