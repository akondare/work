export interface IPoint {
    x: number;
    y: number;
}

export default class Point implements IPoint {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = x;
    }
}