import Point, { IPoint } from './Point';

export interface IRect {
    top: number;
    left: number;
    height: number;
    width: number;
}

export default class Rect implements IRect {
    public left: number;
    public top: number;
    public width: number;
    public height: number;

    constructor(left: number, top: number, width: number, height: number) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }

    public getArray() {
        return [this.left, this.top, this.width, this.height ];
    }

    public getCenterPoint(): Point {
        const centerX: number = this.left + this.width / 2;
        const centerY: number = this.top + this.height / 2;
        return(new Point(centerX, centerY));
    }
    public getBottomRightCorner(): Point {
        const right: number = this.left + this.width;
        const bottom: number = this.top + this.height;
        return(new Point(right, bottom));
    }

    public translateByVector(vector: IPoint) {
        this.left = this.left + vector.x;
        this.top = this.top + vector.y;
        return this;
    }

    public inflate(vector: IPoint) {
        this.top = this.top - vector.x;
        this.left = this.left - vector.y;
        this.width = this.width + 2 * vector.x;
        this.height = this.height + 2 * vector.y;
        return this;
    }
    public scale(scale: number) {
        return new Rect(
            this.top * scale,
            this.left * scale,
            this.width * scale,
            this.height * scale,
        );
    }
    public scaleVec([scaleY, scaleX]: [number, number]) {
        return new Rect(
            this.top * scaleY,
            this.left * scaleX,
            this.width * scaleY,
            this.height * scaleX,
        );
    }
    public translate([offY, offX]: [number, number]) {
        return new Rect(
            this.top * offY,
            this.left * offX,
            this.width,
            this.height,
        );
    }

    public toString() {
        return('{top: ' + this.top +
               ', left: ' + this.left + ', width: ' + this.width + ', height: ' + this.height + '}');
    }
}