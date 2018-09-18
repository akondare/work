import * as tf from '@tensorflow/tfjs';
import IModel from './IModel';
import { Rect, Detection } from '../types';
import ModelOutputUtil from '../ModelOutputUtil';

interface YoloParams {
    iouThres: number;
    probThres: number;
    anchors: [number[][], number[][]];
}
interface YoloConfig {
    classes: string[];
    path: string;
    params?: YoloParams;
}

export default class Yolo3Model implements IModel {
    private static defaultParams: YoloParams = {iouThres: 0.5, probThres: 0.6, anchors: [
        [
            [81, 82],
            [135, 169],
            [344, 319],
        ], [
            [10, 14],
            [23, 27],
            [37, 58],
        ],
    ]};
    private static defaultConfig: YoloConfig = {classes: [], path: '', params: Yolo3Model.defaultParams};

    public title: string;
    public classes: string[];

    protected model: tf.Model;

    protected path: string;
    protected params: YoloParams;

    public constructor(title: string, config?: YoloConfig) {
        this.title = title;
        config = config || Yolo3Model.defaultConfig;
        this.classes = config.classes || [];
        this.path = config.path || '';
        this.params = config.params || Yolo3Model.defaultParams;
    }

    public async load() {
        console.log(this.path);
        this.model = await tf.loadModel(this.path);
    }
    public async unload() {
        this.model = null;
        tf.disposeVariables();
    }

    public filterBoxes(boxes, confs, probs, threshold, width, height) {
        const boxScores = tf.mul(confs, probs);
        const boxClasses = tf.argMax(boxScores, -1);
        const boxClassScores = tf.max(boxScores, -1);
        const predictionMask = tf.greaterEqual(boxClassScores, tf.scalar(threshold)).as1D();
        const N = predictionMask.size;
        const allIndices = tf.linspace(0, N - 1, N).toInt();
        const negIndices = tf.zeros([N], 'int32');
        const indices: any = tf.where(predictionMask, allIndices, negIndices);
        const imgDims: tf.Tensor2D = tf.tensor([height, width, height, width], [1, 4]);
        return [
            tf.gather(boxes.reshape([N, 4]), indices).mul(imgDims),
            tf.gather(boxClassScores.flatten(), indices),
            tf.gather(boxClasses.flatten(), indices),
        ];
    }

    public postProcess(modelOutput, anchors, classNum, width, height) {
        const [boxXY, boxWH, allC, allP] = ModelOutputUtil.yolo3Head(modelOutput, anchors, classNum, width, height);
        const allB = ModelOutputUtil.boxesToCorners(boxXY, boxWH);
        return [allB, allC, allP];
    }

    public async detect(image: HTMLImageElement, rect: Rect): Promise<Detection[]> {
        console.log('running detect', rect);

        // get params
        const {iouThres, probThres, anchors} = this.params;
        console.log(iouThres, probThres, anchors[0]);

        // getting inference output
        const modelOutput: tf.Tensor | tf.Tensor[] = tf.tidy( () => {
            const canvas: HTMLCanvasElement = document.createElement('canvas');
            const context: CanvasRenderingContext2D = canvas.getContext('2d');
            const side = 416;
            const [x, y, w, h] = rect.getArray();
            canvas.width = side;
            canvas.height = side;
            context.drawImage(image, x, y, w, h, 0, 0, side, side);
            const input: tf.Tensor4D = tf.fromPixels(context.getImageData(0, 0, side, side))
                     .expandDims(0).toFloat().div(tf.scalar(255));
            return this.model.predict(input) as tf.Tensor[];
        });

        // run and get filtered boxes
        const [a , b, c]: any = tf.tidy( () => {
            const firstAnchors = anchors[0];
            const [allB, allC, allP] = this.postProcess(
                modelOutput[0],
                tf.tensor2d(firstAnchors, [3, 2], 'float32'),
                this.classes.length, 416, 416);
            return this.filterBoxes(allB, allC, allP, 0.01, 416, 416) as [tf.Tensor, tf.Tensor, tf.Tensor];
        });

        tf.dispose(modelOutput); // dispose input tensor

        // apply non max suppression
        const final: Detection[] = await ModelOutputUtil.NMS(a, b, c, iouThres, probThres);
        tf.dispose([a, b, c]);
        tf.disposeVariables();

        // convert to in image scale
        const [zoneLeft, zoneTop, width, height] = rect.getArray();
        const scaleW = width / 416;
        const scaleH = height / 416;
        return final.map(pred => {
            const [left, top, right, bottom] = pred.box.getArray();
            const leftOffset = Math.max(0, left) * scaleW;
            const topOffset = Math.max(0, top) * scaleH;
            const w = Math.min(width, right * scaleW) - leftOffset;
            const h = Math.min(height, bottom * scaleH) - topOffset;
            return {
                box: new Rect(leftOffset + zoneLeft, topOffset + zoneTop, w, h),
                score: pred.score,
                class: pred.class
            };
        });
    }
}