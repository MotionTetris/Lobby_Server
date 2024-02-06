export const RoomStatuses = {
  READY: 'READY',
  START: 'START',
  WAIT: 'WAIT',
} as const;

export const LockStatuses = {
  LOCK: 'LOCK',
  UNLOCK: 'UNLOCK',
} as const;

export const CreatorStatuses = {
  WAIT: 'WAIT',
  READY: 'READY',
  START: 'START',
} as const;

export const PlayerStatuses = {
  WAIT: 'WAIT',
  READY: 'READY',
} as const;

export const Role = {
  CREATOR: 'CREATOR',
  PLAYER: 'PLAYER',
};

export interface GameRoomDTO {
  roomTitle: string;
  creatorNickname: string;
  currentCount: number;
  maxCount: number;
  backgroundUrl: string;
  roomStatus: keyof typeof RoomStatuses; // Players들이 READY를 다 누르면 READY / 아니면 WAIT / 시작했으면 START
  isLock: keyof typeof LockStatuses;
  passWord: string;
}

export interface RES_GameRoomDTO {
  roomId: number; // 방번호
  roomTitle: string;
  creatorNickname: string; // 방장 닉네임
  currentCount: number; // 현재 인원
  maxCount: number; // 방 최대 인원
  backgroundUrl: string; // 방 배경 사진
  roomStatus: keyof typeof RoomStatuses;
  isLock: keyof typeof LockStatuses;
}
