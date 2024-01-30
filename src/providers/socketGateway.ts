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
  socketID: string;
  status: string;
  room: number;
}

interface StatusInGame {}

@WebSocketGateway({
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
    const { status, room } = this.user[nickname];
    if (status == 'Lobby') {
      client.join(status);
    } else {
      const gameStatus = this.statusInGame.get(nickname);
      client.join(`${room}`);
      client.emit('restoreState', gameStatus);
      this.server
        .to(`${room}`)
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
      this.user[nickname] = { socketID: nickname, status: 'Lobby', room: 0 };
      client.join('Lobby');
    }
  }

  async handleDisconnect(client: Socket) {
    const nickname = await this.verifyToken(client);
    const userStatus = this.user[nickname];
    if (userStatus) {
      this.lobbyUser.delete(nickname);
      if (userStatus.room && this.rooms[userStatus.room]) {
        this.rooms[userStatus.room].delete(nickname);
        if (this.rooms[userStatus.room].size === 0) {
          delete this.rooms[userStatus.room];
          await this.roomService.deleteRoom(userStatus.room);
        }
      }
      delete this.user[client.id];
    }
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: number },
  ) {
    const nickname = await this.verifyToken(client);
    this.lobbyUser.delete(nickname);
    this.user[nickname].room = roomId;
    if (!this.rooms[roomId]) {
      this.rooms[roomId] = new Set();
    }
    this.rooms[roomId].add(nickname);
    client.join(`${roomId}`);
    const roomInfo = await this.roomService.findOne(roomId);
    client.emit('roomInfo', roomInfo);
    this.server.to(`${roomId}`).emit('joinUser', [...this.rooms[roomId]]);
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: string },
  ) {
    const nickname = this.verifyToken(client);
    client.leave(roomId);
    await this.rooms[roomId]?.delete(nickname);
    if (this.rooms[roomId]?.size === 0) {
      delete this.rooms[roomId];
      await this.roomService.deleteRoom(parseInt(roomId));
    }
    client.join('lobby');
  }

  @SubscribeMessage('modifyRoomInfo')
  async modifyRoomInfo(client: Socket, @MessageBody() roomInfo: GameRoomDTO) {
    await this.verifyToken(client);
    const resultInfo = await this.roomService.modifyRoomInfo(roomInfo);
    const { roomId } = roomInfo;
    this.server.to(roomId).emit('modifyRoomInfo', resultInfo);
  }

  // Game Server
  @SubscribeMessage('moveBlock')
  moveBlock() {}

  @SubscribeMessage('turnBlock')
  turnBlock() {}

  @SubscribeMessage('createBlock')
  createBlock() {}
}
