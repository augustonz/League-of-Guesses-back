import {Server as SocketServer} from 'socket.io';
import {Server} from 'http';
import {join_room_data,UserRoom,Room,changeReadyData,PlayerInfo,Message,Game} from './types';

const rooms:Room[] = [];
const games:Game[] = []

const blankUser:UserRoom = {username:'Blank',room:'',socketId:'',isReady:false,imageSrc:''};
const blankRoom:Room = {room:'',isOpen:false,leader:blankUser,users:[]}

function createServer(httpServer:Server) {
    const io = new SocketServer(httpServer, {
        cors:{
            origin:'http://localhost:3000',
            credentials:true,
            methods:['GET','POST']
        }
    });

    function getUsersAndRoomData(roomCode:string):[Room,UserRoom[]] {
        const roomData = rooms.find(room=>room.room==roomCode);
        if (!roomData) return [blankRoom,[]];

        const usersData = roomData.users;

        return [roomData,usersData]
    }

    function getAllUsersInRoomReady(roomCode:string):boolean {
        const [roomData,usersData] = getUsersAndRoomData(roomCode);

        let allReady=usersData.length>1;

        usersData.map(user=>{
            if (user.username==roomData.leader.username) {
                return;
            }if (!user.isReady){
                allReady=false;
            }
        });

        return allReady;
    }

    function removeUserFromRoom(username:string):void {

    }

    function sendPlayersRoom(roomCode:string) {
        const [roomData,usersData] = getUsersAndRoomData(roomCode);
        const tempUsers:UserRoom[] = usersData.map(data=>{return {...data}});

        while (tempUsers.length<10){
            tempUsers.push(blankUser);
        }
        io.to(roomCode).emit('set_players',{players:tempUsers});
    }


    io.on('connection',socket=>{

        socket.on('join_room',(data:join_room_data,callback)=>{
            const room = io.sockets.adapter.rooms.get(data.room);
            const user:UserRoom = {
                imageSrc:'',
                username:data.username,
                room:data.room,
                socketId:socket.id,
                isReady:false
            }
            if (room===undefined) {
                socket.join(data.room);
                rooms.push({
                    room:data.room,
                    leader:user,
                    isOpen:true,
                    users:[user]
                })
                sendPlayersRoom(data.room);
                callback(true);
            } else {
                const [roomData,usersData] = getUsersAndRoomData(data.room);

                if (roomData.isOpen==false) {
                    callback(false);
                }

                const userInRoom = usersData.find(user=>user.username===data.username)
                if (userInRoom) {
                    userInRoom.socketId=socket.id;
                    callback(true);
                } else {
                    socket.join(data.room);
                    usersData.push(user);
                    sendPlayersRoom(data.room);
                    callback(true);
                }
            }
        });

        socket.on('send_message',(data:Message)=>{
            const game = games.find(game=>game.roomCode===data.room);

            game?.messages.push(data);

            io.to(data.room).emit('send_message')
        })

        socket.on('leave_room',(data:join_room_data)=>{
            const [roomData,usersData] = getUsersAndRoomData(data.room);

            const userIndex = usersData.findIndex(user=>user.username===data.username && user.room===data.room)
            if (userIndex>-1) {
                usersData.splice(userIndex,1);
                socket.leave(data.room);
                sendPlayersRoom(data.room);
            } 
        });

        socket.on('close_room',(room:string)=>{
            const [roomData,usersData] = getUsersAndRoomData(room);

            roomData.isOpen=false;
            
            io.to(room).emit('start_game',{roomCode:room});
        });

        socket.on('is_leader',(data:join_room_data,callback)=>{
            const thisRoom = rooms.find(room=>room.room==data.room);
            const resp = thisRoom?.leader.username==data.username;
            callback(resp);
        });

        socket.on('change_ready',(data:changeReadyData)=>{
            const [roomData,usersData] = getUsersAndRoomData(data.room);

            const thisUser = usersData.find(user=>user.username===data.username);
            if (!thisUser) return;
            
            thisUser.isReady=data.ready;
            
            const allReady=getAllUsersInRoomReady(data.room);
            io.to(data.room).emit('set_all_ready',{isAllReady:allReady})

            sendPlayersRoom(data.room);
        });

        socket.on('disconnect', (reason)=>{
            const userRoom = rooms.find(room=>{
                const userIndex = room.users.findIndex(user=>user.socketId==socket.id)
                if (userIndex!=-1){
                    room.users.splice(userIndex,1);
                    return true;
                }
                return false;
            });
            if (!userRoom) return;

            const roomCode = userRoom.room;



            const allReady=getAllUsersInRoomReady(roomCode);
            io.to(roomCode).emit('set_all_ready',{isAllReady:allReady})

            sendPlayersRoom(roomCode);
        })
    });


    return io;
}

export default createServer;