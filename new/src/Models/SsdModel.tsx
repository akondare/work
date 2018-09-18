import * as tf from '@tensorflow/tfjs';
import IModel from './IModel';
import { Rect, Detection } from '../types';

interface SsdParams {
}
interface SsdConfig {
    classes: string[];
    mPath: string;
    wPath: string;
    params?: SsdParams;
}

export default class SsdModel implements IModel {
    private static defaultParams: SsdParams = {};
    private static defaultConfig: SsdConfig = {classes: [], mPath: '', wPath: '', params: SsdModel.defaultParams};

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
        console.log('running detect');
        return [];
    }
}