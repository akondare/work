import * as tf from '@tensorflow/tfjs';
import IModel from './IModel';
import { Rect, Detection } from '../types';
import ModelOutputUtil from '../ModelOutputUtil';

interface YoloParams {
    iouThres: number;
    probThres: number;
    anchors: number[][];
}
interface YoloConfig {
    classes: string[];
    path: string;
    params?: YoloParams;
}

export default class Yolo2Model implements IModel {
    private static defaultParams: YoloParams = {iouThres: 0.4, probThres: 0.4, anchors: [
        [0.57273, 0.677385],
        [1.87446, 2.06253],
        [3.33843, 5.47434],
        [7.88282, 3.52778],
        [9.77052, 9.16828]
    ]};
    private static defaultConfig: YoloConfig = {classes: [], path: '', params: Yolo2Model.defaultParams};

    public title: string;
    public classes: string[];

    protected model: tf.Model;

    protected path: string;
    protected params: YoloParams;

    public constructor(title: string, config?: YoloConfig) {
        this.title = title;
        config = config || Yolo2Model.defaultConfig;
        this.classes = config.classes || [];
        this.path = config.path || '';
        this.params = config.params || Yolo2Model.defaultParams;
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

    public postProcess(modelOutput, anchors, classNum) {
        const [boxXY, boxWH, allC, allP] = ModelOutputUtil.yoloHead(modelOutput, anchors, classNum);
        const allB = ModelOutputUtil.boxesToCorners(boxXY, boxWH);
        return [allB, allC, allP];
    }

    public async detect(image: HTMLImageElement, rect: Rect): Promise<Detection[]> {
        // get params
        const {iouThres, probThres, anchors} = this.params;

        // getting inference output
        const modelOutput: tf.Tensor = tf.tidy( () => {
            const canvas: HTMLCanvasElement = document.createElement('canvas');
            const context: CanvasRenderingContext2D = canvas.getContext('2d');
            const side = 416;
            const [x, y, w, h] = rect.getArray();
            canvas.width = side;
            canvas.height = side;
            context.drawImage(image, x, y, w, h, 0, 0, side, side);
            const input: tf.Tensor4D = tf.fromPixels(context.getImageData(0, 0, side, side))
                     .expandDims(0).toFloat().div(tf.scalar(255));
            console.log(input.shape);
            return this.model.predict(input) as tf.Tensor;
        });

        console.log(modelOutput.shape);

        // run and get filtered boxes
        const [a , b, c]: any = tf.tidy( () => {
            const [allB, allC, allP] = this.postProcess(
                modelOutput,
                tf.tensor2d(anchors, [5, 2], 'float32'),
                this.classes.length);
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