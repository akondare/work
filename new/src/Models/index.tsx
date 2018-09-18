import IModel from './IModel';
import SsdModel from './SsdModel';
import YoloModel from './YoloModel';

const [Coco, F18] = [
    ['cat', 'dog', 'bunny'],
    ['F18'],
];

const Configs = [
    {
        type: 'yolo',
        title: 'Yolo-Coco',
        config: {
            classes: Coco,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/master/model.json',
        }
    }, {
        type: 'yolo',
        title: 'Yolo-F18',
        config: {
            classes: F18,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/f18/model.json',
        }
    }, {
        type: 'ssd',
        title: 'Ssd-Coco',
        config: {
            classes: Coco,
            mPath: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/tensorflowjs_model.pb',
            wPath: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/weights_manifest.json',
        }
    }, {
        type: 'ssd',
        title: 'Ssd-F18',
        config: {
            classes: F18,
            mPath: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/tensorflowjs_model.pb',
            wPath: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/weights_manifest.json',
        }
    }
];

/*
const getModel: () => void = (c: any) => {
    switch(c.type) {
        case 'yolo': return new YoloModel(c.title, c.config);
        case 'ssd': return new SsdModel(c.title, c.config);
    }
};

const Models: IModel[] = [
    new YoloModel('Yolo-Coco'),
    new YoloModel('Yolo-F18'),
    new SsdModel('Ssd-Coco'),
    new SsdModel('Ssd-F18'),
];
*/
const getModel: (c) => IModel = (c: any) => {
    switch(c.type) {
        case 'yolo': return new YoloModel(c.title, c.config);
        case 'ssd': return new SsdModel(c.title, c.config);
        default: return null;
    }
};
const Models: IModel[] = Configs.map(c => getModel(c));

export {IModel};
export default Models;