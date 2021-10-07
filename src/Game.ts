import {Message,PlayerInfo,Room,MessageTypes} from './types';
import championsData from './data.json'
import Image from './Image';

class Game {

    static CHAT_SIZE:number = 60;

    roomCode:string;
    players:PlayerInfo[];
    images:Image[];

    constructor(roomCode:Room) {
        this.roomCode=roomCode.room;
        this.players = roomCode.users.map(user=>{
            const newPlayer = {
                username:user.username,
                imageSrc:user.imageSrc,
                points:0
            };
            return newPlayer;
        });

        this.images=[];
        this.select3RandomImages();

    }

    select3RandomImages():void {
        for (let i=0;i<3;i++){
            this.images.push(this.selectRandomImage());
        }
    }

    selectRandomImage():Image {
        let champName = championsData.champions[Math.floor(Math.random()*championsData.champions.length)];
        const repeat = this.checkRepeatImage(champName);
        while (repeat) {
            champName = championsData.champions[Math.floor(Math.random()*championsData.champions.length)];
        }
        
        let ability;
        if (champName=='Aphelios'){
            ability = ['P','Q1','Q2','Q3','Q4','Q5','R'][Math.floor(Math.random()*championsData.abilities.length)]
        } else {
            ability = championsData.abilities[Math.floor(Math.random()*championsData.abilities.length)]
        }
        return new Image(`${champName}/${champName}_${ability}.png`);
    }

    checkAnswer(message:Message):{result:MessageTypes,imgIndex:number} {
        const content = message.content.toLowerCase();

        let isRight =false;
        let isAlmost =false;
        let isCheating =false;
        let imgIndex = 0;

        this.images.map((img,index)=>{
            const champ = img.url.split('/')[0].toLowerCase();
            const ability = img.url.split('_')[1][0].toLowerCase();

            if (content.includes(champ)){

                const words = content.split(' ');
                
                if (words[0]==champ) {

                    if (words[1]==ability) {
                        isRight=true;
                    } else {
                        isAlmost=true;
                    }
                    imgIndex=index;
                    
                } else {
                    isCheating=true;
                }
            }
        })

        if (isCheating) return {result:MessageTypes.CHEATING,imgIndex:0};
        else if (isRight) return {result:MessageTypes.RIGHT,imgIndex};
        else if (isAlmost) return {result:MessageTypes.ALMOST,imgIndex};
        else return {result:MessageTypes.WRONG,imgIndex:0};
    }

    checkRepeatImage(champName:string):boolean {
        let resp=false;

        this.images.map(img=>{
            if (img.url.includes(champName)) {
                resp=true;
            }
        })

        return resp;
    }

    correctAnswer(message:Message,index:number,correctIds:boolean[]):number {
        if (correctIds[index]) return -1;
        const player = this.players.find(player=>player.username===message.username);
        if (!player) return 0;

        const points = this.images[index].winPoints;
        player.points+=points;

        this.sortPlayersByPoints();

        if (this.images[index].winPoints>1){
            this.images[index].winPoints--;
            this.images[index].corrects++;
        }

        return points;
    }

    sortPlayersByPoints() {
        this.players.sort((a,b)=>b.points-a.points);
    }

    hasWinner():boolean {
        let hasWinner=false;

        this.players.map(player=>{
            if (player.points>=150) hasWinner=true;
        })
        return hasWinner;
    }
    
    handleGameTimer() {
        let activePlayers=0;
        for (let player of this.players) {
            if (player.username!=='Blank') activePlayers++;
        }

        for (let i=0;i<this.images.length;i++) {
        
            this.images[i].reduceTime();
            if (this.images[i].timeRemaining<=-1){
                this.images[i] = this.selectRandomImage();
            }
            if (this.images[i].corrects==activePlayers) {
                this.images[i] = this.selectRandomImage();
            }
        }


    }

}

export default Game;