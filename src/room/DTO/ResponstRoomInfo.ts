export interface ResponseRoomInfo {
  owner: string;
  score: string;
  roomId: number; // 방번호
  title: string; // 방제
  status: string; // 무슨상태??
  creatorProfilePic: string; // 방장 프사
  creatorNickname: string; // 방장 닉네임
  currentCount: number; // 현재 인원
  maxCount: number; // 방 최대 인원
  backgroundUrl: string; // 방 배경 사진
  roomStatus: 'Ready' | 'Start' | 'Wait'; // 방 상태
  isLock: 'Lock' | 'UnLock'; // 방 잠금 유무
  players: string[]; // 참가자 리스트
}
