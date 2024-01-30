import { GameRoomDTO } from './GameRoom_DTO';

export interface IMessage {
  code: string;
  message: GameRoomDTO;
}
