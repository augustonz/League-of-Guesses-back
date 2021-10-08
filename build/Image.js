"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Image {
    constructor(url) {
        this.url = url;
        this.winPoints = 5;
        this.timeRemaining = 30;
        this.corrects = 0;
    }
    reduceTime() {
        if (this.timeRemaining >= 0) {
            this.timeRemaining--;
        }
    }
}
exports.default = Image;
