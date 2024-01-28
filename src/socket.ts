import {Server as SocketServer} from 'socket.io';
import {Server} from 'http';
import {join_room_data,UserRoom,Room,changeReadyData,PlayerInfo,Message,MessageTypes} from './types';
import Game from './Game';

const rooms:Room[] = [];
const games:{game:Game,interval:NodeJS.Timer}[] = [];

const blankPlayer:PlayerInfo = {username:'Blank',points:0,imageSrc:''}
const blankUser:UserRoom = {username:'Blank',room:'',socketId:'',isReady:false,imageSrc:''};
const blankRoom:Room = {room:'',isOpen:false,leader:blankUser,users:[]}

function createServer(httpServer:Server) {
    const io = new SocketServer(httpServer
        , {
            cors:{
                origin:process.env.FRONT_URL,
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
            if (user.username==roomData.leader.username) return;
            if (user.socketId=='') return;
            if (!user.isReady){
                allReady=false;
            }
        });

        return allReady;
    }

    function sendPlayersRoom(roomCode:string) {
        const [roomData,usersData] = getUsersAndRoomData(roomCode);
        const tempUsers:UserRoom[] = usersData.map(data=>{return {...data}});

        while (tempUsers.length<10){
            tempUsers.push(blankUser);
        }
        io.to(roomCode).emit('set_players',{players:tempUsers});
    }

    function addPlayerRoom(roomCode:string,user:UserRoom) {
        const [roomData,usersData] = getUsersAndRoomData(roomCode);

        const blankId = usersData.findIndex(user=>user.socketId==='');

        if (blankId>-1) {
            usersData[blankId]=user;
        }
    }

    function removePlayerRoom(roomCode:string,username:string):boolean {
        const [roomData,usersData] = getUsersAndRoomData(roomCode);

        const selectedId = usersData.findIndex(user=>user.username===username);

        if (selectedId>-1) {
            usersData[selectedId]=blankUser;
            return true;
        }
        return false;
    }

    function removePlayerGame(roomCode:string,username:string) {
        const game = games.find(({game,interval})=>game.roomCode===roomCode)?.game;

        if (!game) return;

        const selectedId = game.players.findIndex(player=>player.username===username);

        if (selectedId>-1) {
            game.players[selectedId]=blankPlayer;
            io.to(game.roomCode).emit('update_game',game);
        }
    }

    function createSysMessage(content:string,color:string,room:string):Message {
        return {
            color,
            content,
            username:'',
            system:true,
            room
        }
    }

    function endGame(data:Game) {
        const gameIndex = games.findIndex(({game,interval})=>game.roomCode==data.roomCode);
        const roomIndex = rooms.findIndex(room=>room.room==data.roomCode);

        if (gameIndex>-1) {
            clearInterval(games[gameIndex].interval);
            games.splice(gameIndex,1);
        }

        if (roomIndex>-1) {
            rooms.splice(roomIndex,1);
        }

        io.to(data.roomCode).emit('end_game');
    }

    io.on('connection',socket=>{

        socket.on('send_message',(data:Message,correctIds:boolean[])=>{
            const game = games.find(({game,interval})=>game.roomCode===data.room)?.game;
            
            if (!game) return;
            
            const {result,imgIndex} =game.checkAnswer(data);
            
            if (result==MessageTypes.CHEATING) {
                socket.emit('send_message',createSysMessage('Please don\'t spoil the fun for others.','#ff0000',data.room));
            } else if (result==MessageTypes.ALMOST) {
                socket.emit('send_message',createSysMessage('You\'re almost there!','#F4DE93',data.room));
            } else if (result==MessageTypes.WRONG) {
                io.to(data.room).emit('send_message',data);
            } else {
                const value = game.correctAnswer(data,imgIndex,correctIds);
                if (value<0) return;
                socket.to(data.room).emit('other_correct');
                io.to(data.room).emit('send_message',createSysMessage(`${data.username} acertou!`,'#00ff00',data.room));
                socket.emit('correct_message',{points:value,index:imgIndex});

                io.to(game.roomCode).emit('update_game',game);
            }
        })
        
        socket.on('join_room',(data:join_room_data,callback)=>{
            const room = rooms.find(room=>room.room==data.room);
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
                    users:[user,blankUser,blankUser,blankUser,blankUser,blankUser,blankUser,blankUser,blankUser,blankUser]
                })
                const [roomData,usersData] = getUsersAndRoomData(data.room);
                callback(roomData);
            } else {
                const [roomData,usersData] = getUsersAndRoomData(data.room);

                if (roomData.isOpen==false) {
                    callback(null);
                }

                const userInRoom = usersData.find(user=>user.username===data.username)
                if (userInRoom) {
                    userInRoom.socketId=socket.id;
                    callback(roomData);
                } else {
                    socket.join(data.room);
                    addPlayerRoom(data.room,user);
                    callback(roomData);
                    
                }
            }
            sendPlayersRoom(data.room);
        });

        socket.on('leave_room',(data:join_room_data)=>{
            const [roomData,usersData] = getUsersAndRoomData(data.room);

            const result =removePlayerRoom(data.room,data.username);
            if (result) {
                socket.leave(data.room);
            } 
            sendPlayersRoom(data.room);
        });

        socket.on('close_room',(room:string)=>{
            const [roomData,usersData] = getUsersAndRoomData(room);
            roomData.isOpen=false;
            
            const newGame = new Game(roomData);

            /*function gameTime() {
                newGame.handleGameTimer();
                io.to(newGame.roomCode).emit('update_game',newGame);
                if (newGame.hasWinner()){
                    endGame(newGame);
                }
                setTimeout(gameTime,1000);
            }*/
            function gameTime() {
                newGame.handleGameTimer();
                io.to(newGame.roomCode).emit('update_game',newGame);
                if (newGame.hasWinner()){
                    endGame(newGame);
                }
                setTimeout(gameTime,1000);
            }
            /*const intervalId = setInterval(()=>{
                newGame.handleGameTimer();
                io.to(newGame.roomCode).emit('update_game',newGame);
                if (newGame.hasWinner()){
                    endGame(newGame);
                }
                setTimeout(gameTime,1000);
            },1000);*/
            gameTime();
            games.push({game:newGame,interval:setTimeout(()=>{})});
            io.to(room).emit('start_game',newGame);
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
                    removePlayerRoom(room.room,room.users[userIndex].username);
                    removePlayerGame(room.room,room.users[userIndex].username);
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