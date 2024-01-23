export interface GameRoomDTO{
    owner:string,
    title:string;
    status:"Ready"|"Start";
    isLock:"Lock"|"UnLock";
    players:string[];
}
