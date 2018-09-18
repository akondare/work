import {IPoint,Point} from "./Point"

export interface IRect {
    top:number;
    left:number;
    height:number;
    width:number;
}

export class Rect implements IRect {
    
    public left:number;
    public top:number;
    public width:number;
    public height:number;

    constructor(left:number,top:number,width:number,height:number) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }

    public getDetails() {
        return [this.left,this.top,this.width,this.height]
    }

    public getCenterPoint():Point {
        const centerX:number = this.left + this.width/2;
        const centerY:number = this.top + this.height/2;
        return(new Point(centerX, centerY));
    }
    public getBottomRightCorner():Point {
        const right:number = this.left + this.width;
        const bottom:number = this.top + this.height;
        return(new Point(right, bottom));
    }

    public translateByVector(vector:IPoint) {
        this.left = this.left + vector.x;
        this.top = this.top + vector.y;
        return this;
    }

    public inflate(vector:IPoint) {
        this.top = this.top - vector.x;
        this.left = this.left - vector.y;
        this.width = this.width + 2*vector.x;
        this.height = this.height + 2*vector.y;
        return this;
    }
    public scale(scalar:number) {
        return new Rect(
            this.top*scalar,
            this.left*scalar,
            this.width*scalar,
            this.height*scalar,
        )
    }

    public toString() {
        return("{top: " + this.top + ", left: " + this.left + ", width: " + this.width + ", height: " + this.height + "}");
    }
}