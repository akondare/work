import {Rect} from "./Rect"

export default interface IDetection {
    box:Rect;
    score:number;
    class:number;
}