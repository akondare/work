// import * as tf from '@tensorflow/tfjs'
// import Classes from "./Classes"

const version:number = 1; 
// const classNumber:number = Classes.length; 

export enum ModelType {
    SSD='ssd',
    YOLO2='yolo2',
    YOLO3='yolo3',
}

export interface IConfig {
    type:ModelType,
    path:string,
    weights?:string,
    size:{width:number,height:number},
    iouThreshold:number
    probThreshold:number
    // classNumber:number,
    anchors:number[][] | number[][][],
    numOfClasses:number
}

export interface IConfigs {
    version:number,
    modelNames:string[],
    configs:IConfig[]
}

const Config:IConfigs = {
    configs: [
        {
            anchors: [
                [0.57273, 0.677385], 
                [1.87446, 2.06253], 
                [3.33843, 5.47434],
                [7.88282, 3.52778], 
                [9.77052, 9.16828] 
            ],
            iouThreshold: 0.4,
            numOfClasses: 80,
            path: 'https://raw.githubusercontent.com/SkalskiP/ILearnMachineLearning.js/master/models/tfjs-yolo-tiny/model.json', 
            probThreshold:0.4,
            size: {
                height:416,
                width:416,
            },
            type:ModelType.YOLO2,
        },{
            anchors: [[
                [81,82],
                [135,169],
                [344,319],
            ], [
                [10,14],
                [23,27],
                [37,58],
            ]],
            // classNumber: 7,
            iouThreshold: 0.5,
            numOfClasses: 1,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/f18/model.json',
            probThreshold: 0.6,
            size:{
                height:416,
                width:416,
            },
            type:ModelType.YOLO3,
            /*
            size:{
                height:416,
                width:416,
            },
            */
        },{
            anchors: [[
                [81,82],
                [135,169],
                [344,319],
            ], [
                [10,14],
                [23,27],
                [37,58],
            ]],
            iouThreshold: 0.7,
            numOfClasses: 80,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/tensorflowjs_model.pb',
            probThreshold: 0.6,
            size:{
                height:null,
                width:null,
            },
            type:ModelType.SSD,
            weights: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/weights_manifest.json',
        }
    ],
    modelNames: [
        "Coco",
        "F18",
        "ssd",
    ],
    version,
} 

/*
        },{
            anchors: [[
                [81,82],
                [135,169],
                [344,319],
            ], [
                [10,14],
                [23,27],
                [37,58],
            ]],
            iouThreshold: 0.5,
            numOfClasses: 80,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/master/model.json',
            probThreshold: 0.6,
            size:{
                height:416,
                width:416,
            },
            type:ModelType.YOLO3,
        },{
            anchors: [[
                [81,82],
                [135,169],
                [344,319],
            ], [
                [10,14],
                [23,27],
                [37,58],
            ]],
            iouThreshold: 0.7,
            numOfClasses: 80,
            path: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/tensorflowjs_model.pb',
            probThreshold: 0.6,
            size:{
                height:null,
                width:null,
            },
            type:ModelType.SSD,
            weights: 'https://raw.githubusercontent.com/akondare/F18Model/ssdm/weights_manifest.json',
            */
export default Config;