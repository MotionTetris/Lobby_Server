import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameRoomDTO } from 'src/room/DTO';
import { JwtService } from '@nestjs/jwt'
import { RoomService } from '../src/room/room.service';
import { Inject, Injectable } from '@nestjs/common';


interface UserStatus {
    nickname: string;
    status: string;
    room: number;
}

@WebSocketGateway({
    cors: {
        origin: '*', // 모든 도메인에서의 접근을 허용합니다. 실제 사용 시에는 보안을 위해 구체적인 도메인을 명시하는 것이 좋습니다.
        credentials: true, // 쿠키를 사용할 경우 true로 설정
    }
})
export class AppGateway {

    constructor(
        private jwtService: JwtService,
        private roomService: RoomService
    ) { }

    @WebSocketServer()
    server: Server;
    lobbyUser: Set<string> = new Set();
    rooms: { [roomId: number]: Set<string> } = {};
    user: { [clientId: string]: UserStatus } = {};

    async modifyRoomInfo(roomId:number, payload:GameRoomDTO){
        this.server.to(`${roomId}`).emit('modifyRoomInfo',payload)
    }


    handleConnection(client: Socket) {
        const token = Array.isArray(client.handshake.query.token) ? client.handshake.query.token[0] : client.handshake.query.token;
        try {
            // const decoded = this.jwtService.verify(token)
            const decoded = this.jwtService.decode(token) as { nickname: string }; // 토큰 구조에 따라 타입 캐스팅
            this.lobbyUser.add(client.id);
            this.user[client.id] = { nickname: decoded.nickname, status: "Lobby", room: 0 };
            client.join("Lobby");
        } catch (e) {
            client.emit('error', 'Invalid token. Connection refused.');
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userStatus = this.user[client.id];
        if (userStatus) {
            this.lobbyUser.delete(client.id);
            if (userStatus.room && this.rooms[userStatus.room]) {
                this.rooms[userStatus.room].delete(client.id);
                if (this.rooms[userStatus.room].size === 0) {
                    delete this.rooms[userStatus.room];
                    this.roomService.deleteRoom(userStatus.room);
                }
            }
            delete this.user[client.id];
            this.server.emit('userDisconnected', client.id);
        }
    }

    broadcastEvent(data: GameRoomDTO) {
        this.server.emit('message', data);
    }

    @SubscribeMessage("joinRoom")
    joinRoom(@ConnectedSocket() client: Socket, @MessageBody() { roomId }: { roomId: number }) {
        const { id: clientId } = client;
        this.lobbyUser.delete(clientId);
        this.user[clientId].room = roomId;
        if (!this.rooms[roomId]) {
            this.rooms[roomId] = new Set();
        }
        this.rooms[roomId].add(clientId);
        client.join(`${roomId}`);
        this.server.to(`${roomId}`).emit("joinUser", [...this.rooms[roomId]]);
    }

    @SubscribeMessage('leaveRoom')
    async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() { roomId }: { roomId: string }) {
        const clientId = client.id;
        client.leave(roomId);
        this.rooms[roomId]?.delete(clientId);
        if (this.rooms[roomId]?.size === 0) {
            delete this.rooms[roomId];
            await this.roomService.deleteRoom(parseInt(roomId));
        }
        client.join('lobby');
        // this.server.to('lobby').emit('userJoinedLobby', clientId);
    }

    // Game Server

    
    
}