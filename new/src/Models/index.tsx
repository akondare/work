import IModel from './IModel';
import SsdModel from './SsdModel';
import Yolo2Model from './Yolo2Model';
import Yolo3Model from './Yolo3Model';
import COCO from './Coco';
import F18 from './F18';

const Configs = [
    {
        type: 'yolo2',
        title: 'YOLO-COCO',
        config: {
            classes: COCO,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/master/model.json',
        }
    }, {
        type: 'yolo3',
        title: 'YOLO-F18',
        config: {
            classes: F18,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/f18/model.json',
        }
    }, {
        type: 'ssd',
        title: 'SSD-COCO',
        config: {
            classes: COCO,
            mPath: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/tensorflowjs_model.pb',
            wPath: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/weights_manifest.json',
        }
    }
];

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