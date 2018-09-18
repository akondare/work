import Rect from './Rect';

export default interface Detection {
    box: Rect;
    score: number;
    class: number;
}