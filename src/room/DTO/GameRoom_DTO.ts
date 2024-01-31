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
  PLAYER:'PLAYER'
}



export interface GameRoomDTO {
  role: keyof typeof Role;
  playerstatus: keyof typeof CreatorStatuses | keyof typeof PlayerStatuses;
  roomId: number;
  title: string;
  creatorProfilePic: string;
  creatorNickname: string;
  currentCount: number;
  score:number;
  maxCount: number;
  backgroundUrl: string;
  roomStatus: keyof typeof RoomStatuses;
  isLock: keyof typeof LockStatuses;
  players: string[];
}