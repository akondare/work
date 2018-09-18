import IModel from './IModel';
import SsdModel from './SsdModel';
import Yolo2Model from './Yolo2Model';
import Yolo3Model from './Yolo3Model';

const [Coco, F18] = [
    [
        'person',
        'bicycle',
        'car',
        'motorbike',
        'aeroplane',
        'bus',
        'train',
        'truck',
        'boat',
        'traffic light',
        'fire hydrant',
        'stop sign',
        'parking meter',
        'bench',
        'bird',
        'cat',
        'dog',
        'horse',
        'sheep',
        'cow',
        'elephant',
        'bear',
        'zebra',
        'giraffe',
        'backpack',
        'umbrella',
        'handbag',
        'tie',
        'suitcase',
        'frisbee',
        'skis',
        'snowboard',
        'sports ball',
        'kite',
        'baseball bat',
        'baseball glove',
        'skateboard',
        'surfboard',
        'tennis racket',
        'bottle',
        'wine glass',
        'cup',
        'fork',
        'knife',
        'spoon',
        'bowl',
        'banana',
        'apple',
        'sandwich',
        'orange',
        'broccoli',
        'carrot',
        'hot dog',
        'pizza',
        'donut',
        'cake',
        'chair',
        'sofa',
        'pottedplant',
        'bed',
        'diningtable',
        'toilet',
        'tvmonitor',
        'laptop',
        'mouse',
        'remote',
        'keyboard',
        'cell phone',
        'microwave',
        'oven',
        'toaster',
        'sink',
        'refrigerator',
        'book',
        'clock',
        'vase',
        'scissors',
        'teddy bear',
        'hair drier',
        'toothbrush',
      ],
    ['F18'],
];

const Configs = [
    {
        type: 'yolo2',
        title: 'Yolo-Coco',
        config: {
            classes: Coco,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/master/model.json',
        }
    }, {
        type: 'yolo3',
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
        case 'yolo2': return new Yolo2Model(c.title, c.config);
        case 'yolo3': return new Yolo3Model(c.title, c.config);
        case 'ssd': return new SsdModel(c.title, c.config);
        default: return null;
    }
};
const Models: IModel[] = Configs.map(c => getModel(c));

export {IModel};
export default Models;