import * as tf from '@tensorflow/tfjs';
import IModel from './IModel';
import { Rect, Detection } from '../types';

interface SsdParams {
    scoreThres: number;
}

interface SsdConfig {
    classes: string[];
    mPath: string;
    wPath: string;
    params?: SsdParams;
}

export default class SsdModel implements IModel {
    private static defaultParams: SsdParams = {
        scoreThres: 0.6
    };
    private static defaultConfig: SsdConfig = {
        classes: [],
        mPath: '',
        wPath: '',
        params: SsdModel.defaultParams
    };

    public title: string;
    public classes: string[];
    protected model: tf.FrozenModel;

    protected mPath: string;
    protected wPath: string;
    protected params: SsdParams;

    public constructor(title: string, config?: SsdConfig) {
        this.title = title;
        config = config || SsdModel.defaultConfig;
        this.classes = config.classes || [];
        this.mPath = config.mPath || '';
        this.wPath = config.wPath || '';
        this.params = config.params || SsdModel.defaultParams;
    }

    public async load() {
        this.model = await tf.loadFrozenModel( this.mPath, this.wPath);
    }
    public async unload() {
        this.model = null;
        tf.disposeVariables();
    }

    public async detect(image: HTMLImageElement, rect: Rect): Promise<Detection[]> {
        const [x, y, width, height] = [
            Math.floor(rect.left),
            Math.floor(rect.top),
            Math.ceil(rect.width),
            Math.ceil(rect.height),
        ];
        const input: tf.Tensor4D = tf.tidy( () => {
            const canvas: HTMLCanvasElement = document.createElement('canvas');
            const context: CanvasRenderingContext2D = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;
            context.drawImage(image, x, y, width, height, 0, 0, width, height);
            return tf.fromPixels(context.getImageData(0, 0, width, height)).expandDims(0);
        });

        const modelOutput: tf.Tensor[] = (await this.model.executeAsync(input)) as tf.Tensor[];
        tf.dispose(input);

        const num: number = (await modelOutput[3].data())[0];
        const post: tf.Tensor[] = tf.tidy(() => {
            const toRet: tf.Tensor[] = [
                modelOutput[0].squeeze().slice(0, num).mul(tf.tensor1d([height, width, height, width])),
                modelOutput[1].squeeze().slice(0, num),
                modelOutput[2].squeeze().slice(0, num).sub(tf.scalar(2))
            ];
            return toRet;
        });

        const [boxes, scores, classes]: Float32Array[] = await Promise.all([
            post[0].data(),
            post[1].data(),
            post[2].data(),
        ]) as Float32Array[];

        tf.dispose(modelOutput);
        tf.dispose(post);

        const detections: Detection[] = [];
        const [zoneLeft, zoneTop, , ] = rect.getArray();
        scores.forEach((score, i) => {
            if( score < this.params.scoreThres ) { return; }
            const ind = i * 4;
            const top = boxes[ind];
            const left = boxes[ind + 1];
            const bottom = boxes[ind + 2];
            const right = boxes[ind + 3];

            detections.push({
                box: new Rect(left + zoneLeft, top + zoneTop, right - left, bottom - top),
                class: classes[i],
                score,
            });
        });
        return detections;
    }
}