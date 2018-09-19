import * as tf from '@tensorflow/tfjs';
import {IConfig} from './Config';
import IDetection from './Utils/IDetection';
import ModelOutputUtil from './Utils/ModelOutputUtil';
import { Rect } from './Utils/Rect';

export interface IBox {
    x: number,
    y: number,
    width: number,
    height: number
    score: number,
}

export interface IDetectUtil {
    [model: string]: (model:any,imageData:tf.Tensor4D,config:IConfig)=>Promise<IDetection[]>
}

const filterBoxes = (boxes,confs,probs,threshold,width,height) => {
    const boxScores = tf.mul(confs, probs);
    const boxClasses = tf.argMax(boxScores, -1);
    const boxClassScores = tf.max(boxScores, -1);
      
    const predictionMask = tf.greaterEqual(boxClassScores, tf.scalar(threshold)).as1D();
      
    const N = predictionMask.size
    const allIndices = tf.linspace(0, N - 1, N).toInt();
    const negIndices = tf.zeros([N], 'int32');
    const indices:any = tf.where(predictionMask, allIndices, negIndices);

    const imgDims:tf.Tensor2D = tf.tensor([height,width,height,width],[1,4])
      
    return [
        tf.gather(boxes.reshape([N, 4]), indices).mul(imgDims),
        tf.gather(boxClassScores.flatten(), indices),
        tf.gather(boxClasses.flatten(), indices),
    ];
};

const yoloPostProcess = (modelOutput,anchors,classNum) => {
    const [boxXY, boxWH, allC, allP] = ModelOutputUtil.yoloHead(modelOutput, anchors, classNum);
    const allB = ModelOutputUtil.boxesToCorners3(boxXY, boxWH);
    return [allB,allC,allP]
}; 
const yolo3PostProcess = (modelOutput,anchors,classNum,width,height) => {
    const [boxXY, boxWH, allC, allP] = ModelOutputUtil.yolo3Head(modelOutput, anchors, classNum,width,height);
    const allB = ModelOutputUtil.boxesToCorners(boxXY, boxWH);
    return [allB,allC,allP]
}; 

const DetectUtil:IDetectUtil = {
        ssd: async (model:tf.FrozenModel,input:tf.Tensor4D,config:IConfig):Promise<IDetection[]> => {
            console.log("before Frozen :", tf.memory())

            const width:number = input.shape[1]
            const height:number = input.shape[2]
            console.log("width : ",width,"height: ",height)
            // width = 416
            // height = 416
    
            const modelOutput:tf.Tensor[] = (await model.executeAsync(input)) as tf.Tensor[];
            const num:number = (await modelOutput[3].data())[0];
            const post:tf.Tensor[] = tf.tidy(() => {
                const toRet:tf.Tensor[] = [ 
                    modelOutput[0].squeeze().slice(0,num).mul(tf.tensor1d([width,height,width,height])),
                    modelOutput[1].squeeze().slice(0,num),
                    modelOutput[2].squeeze().slice(0,num).sub(tf.scalar(2))
                ]
                return toRet
            });

            const [boxes,scores,classes]:Float32Array[] = await Promise.all([
                post[0].data(),
                post[1].data(),
                post[2].data(),
            ]) as Float32Array[];
            tf.dispose(modelOutput)
            tf.dispose(post);

            console.log(boxes);

            const detections:IDetection[] = [];
            scores.forEach((score,i) => {
                const ind:number = i*4
                detections.push({
                    box: new Rect(boxes[ind],boxes[ind+1],boxes[ind+2],boxes[ind+3]),
                    class: classes[i],
                    score,
                });
            });
            return detections;
        },
        yolo2: async (model:tf.Model,input:any,config:IConfig) => {
            console.log("before :", tf.memory())

            const width:number = input.shape[2]
            const height:number = input.shape[1]
    
            const [preB,preS,preC]:tf.Tensor[] = tf.tidy(() => {
                const modelOutput: any = model.predict(input.toFloat().div(tf.scalar(255)));
                const anchors = config.anchors as number[][];
                const [allB,allC,allP] = yoloPostProcess(modelOutput, tf.tensor2d(anchors,[5,2],'float32'), config.numOfClasses);
                return filterBoxes(allB,allC,allP,0.01,width,height);
            });
            tf.dispose(input)
    
            if (preB==null) {
                tf.dispose([preB,preS,preC])
                return []
            };

            const results:IDetection[] = await ModelOutputUtil.NMS(preB,preS,preC,config.iouThreshold,config.probThreshold)
    
            tf.dispose([preB,preS,preC])
            tf.disposeVariables();

            console.log("after :", tf.memory(),results)
    
            return results;
        },
        yolo3: async (model:tf.Model,input:any,config:IConfig) => {
            console.log("before :", tf.memory())

            const height:number = input.shape[1]
            const width:number = input.shape[2]
            console.log(width,height)
    
            const modelOutput: any = tf.tidy(()=>model.predict(input.toFloat().div(tf.scalar(255))));
            console.log(modelOutput)
            const [preB1,preS1,preC1]:tf.Tensor[] = tf.tidy(() => {
                const anchors = config.anchors[0] as number[][];
                const [allB,allC,allP] = yolo3PostProcess(modelOutput[0], tf.tensor2d(anchors,[3,2],'float32'), config.numOfClasses,width,height);
                return filterBoxes(allB,allC,allP,0.01,width,height);
            });
            const [preB2,preS2,preC2]:tf.Tensor[] = tf.tidy(() => {
                const anchors = config.anchors[1] as number[][];
                const [allB,allC,allP] = yolo3PostProcess(modelOutput[1], tf.tensor2d(anchors,[3,2],'float32'), config.numOfClasses,width,height);
                return filterBoxes(allB,allC,allP,0.01,width,height);
            });

            const preB = tf.concat([preB1,preB2]);
            const preS = tf.concat([preS1,preS2]);
            const preC = tf.concat([preC1,preC2]);
            tf.dispose([input,preB1,preB2,preS1,preS2,preC1,preC2])
            /*
            const preB = preB1;
            const preS = preS1;
            const preC = preC1;
            tf.dispose(input);
            */
    
            if (preB==null) {
                tf.dispose([preB,preS,preC])
                return []
            };
    
            const results:IDetection[] = await ModelOutputUtil.NMS(preB,preS,preC,config.iouThreshold,config.probThreshold)
    
            tf.dispose([preB,preS,preC])
            tf.disposeVariables();
            console.log("after :", tf.memory(),results)
    
            return results;
        },
    }

export default DetectUtil;