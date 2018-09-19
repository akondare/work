import { Rect, Detection } from '../types';

export default interface IModel {
    title: string;
    classes: string[];
    load: () => Promise<void>;
    unload: () => Promise<void>;
    detect: (image: HTMLImageElement, rect: Rect) => Promise<Detection[]>;
}