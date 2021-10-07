class Image {

    url:string;
    timeRemaining:number;
    winPoints:number;
    corrects:number;

    constructor(url:string) {
        this.url=url;
        this.winPoints=5;
        this.timeRemaining=30;
        this.corrects=0;
    }

    reduceTime() {
        if (this.timeRemaining>=0){
            this.timeRemaining--;
        }
    }

}

export default Image;