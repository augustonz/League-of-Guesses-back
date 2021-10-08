"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const data_json_1 = __importDefault(require("./data.json"));
const Image_1 = __importDefault(require("./Image"));
class Game {
    constructor(roomCode) {
        this.roomCode = roomCode.room;
        this.players = roomCode.users.map(user => {
            const newPlayer = {
                username: user.username,
                imageSrc: user.imageSrc,
                points: 0
            };
            return newPlayer;
        });
        this.images = [];
        this.select3RandomImages();
    }
    select3RandomImages() {
        for (let i = 0; i < 3; i++) {
            this.images.push(this.selectRandomImage());
        }
    }
    selectRandomImage() {
        let champName = data_json_1.default.champions[Math.floor(Math.random() * data_json_1.default.champions.length)];
        const repeat = this.checkRepeatImage(champName);
        while (repeat) {
            champName = data_json_1.default.champions[Math.floor(Math.random() * data_json_1.default.champions.length)];
        }
        let ability;
        if (champName == 'Aphelios') {
            ability = ['P', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'R'][Math.floor(Math.random() * data_json_1.default.abilities.length)];
        }
        else {
            ability = data_json_1.default.abilities[Math.floor(Math.random() * data_json_1.default.abilities.length)];
        }
        return new Image_1.default(`${champName}/${champName}_${ability}.png`);
    }
    checkAnswer(message) {
        const content = message.content.toLowerCase();
        let isRight = false;
        let isAlmost = false;
        let isCheating = false;
        let imgIndex = 0;
        this.images.map((img, index) => {
            const champ = img.url.split('/')[0].toLowerCase();
            const ability = img.url.split('_')[1][0].toLowerCase();
            if (content.includes(champ)) {
                const words = content.split(' ');
                if (words[0] == champ) {
                    if (words[1] == ability) {
                        isRight = true;
                    }
                    else {
                        isAlmost = true;
                    }
                    imgIndex = index;
                }
                else {
                    isCheating = true;
                }
            }
        });
        if (isCheating)
            return { result: types_1.MessageTypes.CHEATING, imgIndex: 0 };
        else if (isRight)
            return { result: types_1.MessageTypes.RIGHT, imgIndex };
        else if (isAlmost)
            return { result: types_1.MessageTypes.ALMOST, imgIndex };
        else
            return { result: types_1.MessageTypes.WRONG, imgIndex: 0 };
    }
    checkRepeatImage(champName) {
        let resp = false;
        this.images.map(img => {
            if (img.url.includes(champName)) {
                resp = true;
            }
        });
        return resp;
    }
    correctAnswer(message, index, correctIds) {
        if (correctIds[index])
            return -1;
        const player = this.players.find(player => player.username === message.username);
        if (!player)
            return 0;
        const points = this.images[index].winPoints;
        player.points += points;
        this.sortPlayersByPoints();
        if (this.images[index].winPoints > 1) {
            this.images[index].winPoints--;
            this.images[index].corrects++;
        }
        return points;
    }
    sortPlayersByPoints() {
        this.players.sort((a, b) => b.points - a.points);
    }
    hasWinner() {
        let hasWinner = false;
        this.players.map(player => {
            if (player.points >= 150)
                hasWinner = true;
        });
        return hasWinner;
    }
    handleGameTimer() {
        let activePlayers = 0;
        for (let player of this.players) {
            if (player.username !== 'Blank')
                activePlayers++;
        }
        for (let i = 0; i < this.images.length; i++) {
            this.images[i].reduceTime();
            if (this.images[i].timeRemaining <= -1) {
                this.images[i] = this.selectRandomImage();
            }
            if (this.images[i].corrects == activePlayers) {
                this.images[i] = this.selectRandomImage();
            }
        }
    }
}
Game.CHAT_SIZE = 60;
exports.default = Game;
