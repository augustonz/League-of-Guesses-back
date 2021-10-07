export interface join_room_data {
    username:string,
    room:string
}

export interface UserRoom {
    username:string,
    room:string,
    socketId:string,
    isReady:boolean,
    imageSrc:string
}

export interface PlayerInfo {
    username:string,
    imageSrc:string,
    points:number
}

export interface Room {
    room:string,
    isOpen:boolean,
    leader:UserRoom,
    users:UserRoom[]
}

export enum MessageTypes {
    'RIGHT','WRONG','ALMOST','CHEATING'
}

export interface Message {
    username:string,
    content:string,
    room:string,
    color:string,
    system:boolean
}

export interface changeReadyData extends join_room_data{
    ready:boolean
}