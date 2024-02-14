interface InGameRoomInfo {
  creatorNickname: string[];
  playersNickname: Set<string>;
  roomId: number;
  roomTitle: string;
  maxCount: number;
  readyUsers: Set<string>;
  status: boolean;
}
interface InGameRoomInfo_DTO {
  creatorNickname: string[];
  playersNickname: Array<string>;
  roomId: number;
  roomTitle: string;
  maxCount: number;
  readyUsers: Array<string>;
}
