import * as tf from '@tensorflow/tfjs';
import { Tensor } from '@tensorflow/tfjs';
import IDetection from './IDetection'
import {Rect} from './Rect'
// import { nonMaxSuppression } from '../../../node_modules/@tensorflow/tfjs-core/dist/ops/image_ops';

export default class ModelOutputUtil {

    /**
     * Convert data received from final layer to bounding box parameters
     * @param modelOutput - output of final convolutional layer
     * @param anchorBoxes - anchor box widths and heights
     * @param numClasses - number of target classes
     */
    public static yoloHead(modelOutput, anchorBoxes, numClasses) {

        const numberOfAnchorBoxes = anchorBoxes.shape[0]; 
        const anchorsTensor = tf.reshape(anchorBoxes, [1, 1, anchorBoxes.shape[0], anchorBoxes.shape[1]]);

        // Each photo is divided into a grid of cells
        let gridSize = modelOutput.shape.slice(1, 3);
        const gridSizeV = gridSize[0];
        const gridSizeH = gridSize[1];
      
        // In YOLO vertical index is the inner most iteration.
        let gridIndexV = tf.range(0, gridSizeV);
        let gridIndexH = tf.range(0, gridSizeH);

        gridIndexV = tf.tile(gridIndexV, [gridSize[1]])
        gridIndexH = tf.tile(tf.expandDims(gridIndexH, 0), [gridSize[0], 1]);
        gridIndexH = tf.transpose(gridIndexH).flatten();
      
        let convIndex = tf.transpose(tf.stack([gridIndexV, gridIndexH]));
        convIndex = tf.reshape(convIndex, [gridSize[0], gridSize[1], 1, 2])
        convIndex = tf.cast(convIndex, modelOutput.dtype);
      
        modelOutput = tf.reshape(modelOutput, [gridSize[0], gridSize[1], numberOfAnchorBoxes, numClasses + 5]);
        gridSize = tf.cast(tf.reshape(tf.tensor1d(gridSize), [1,1,1,2]), modelOutput.dtype);
      
        let boxPosition = tf.sigmoid(modelOutput.slice([0,0,0,0], [gridSizeV, gridSizeH, numberOfAnchorBoxes, 2]))
        let boxSize = tf.exp(modelOutput.slice([0,0,0,2], [gridSizeV, gridSizeH, numberOfAnchorBoxes, 2]))
        const boxConfidence = tf.sigmoid(modelOutput.slice([0,0,0,4], [gridSizeV, gridSizeH, numberOfAnchorBoxes, 1]))
        const boxClassProbs = tf.softmax(modelOutput.slice([0,0,0,5],[gridSizeV, gridSizeH, numberOfAnchorBoxes, numClasses]));
      
        // Adjust preditions to each spatial grid point and anchor size
        boxPosition = tf.div(tf.add(boxPosition, convIndex), gridSize);
        boxSize = tf.div(tf.mul(boxSize, anchorsTensor), gridSize);
      
        return [ boxPosition, boxSize, boxConfidence, boxClassProbs ];
    }

    /**
     * Convert data received from final layer to bounding box parameters
     * @param modelOutput - output of final convolutional layer
     * @param anchorBoxes - anchor box widths and heights
     * @param numClasses - number of target classes
     */
    public static yolo3Head(modelOutput, anchorBoxes, numClasses, width, height) {

        const numberOfAnchorBoxes = anchorBoxes.shape[0]; 
        const anchorsTensor = tf.reshape(anchorBoxes, [1, 1, anchorBoxes.shape[0], anchorBoxes.shape[1]]);

        // Each photo is divided into a grid of cells
        let gridSize = modelOutput.shape.slice(1, 3);
        const gridSizeV = gridSize[0];
        const gridSizeH = gridSize[1];
      
        // In YOLO vertical index is the inner most iteration.
        let gridIndexV = tf.range(0, gridSizeV);
        let gridIndexH = tf.range(0, gridSizeH);

        gridIndexV = tf.tile(gridIndexV, [gridSize[1]])
        gridIndexH = tf.tile(tf.expandDims(gridIndexH, 0), [gridSize[0], 1]);
        gridIndexH = tf.transpose(gridIndexH).flatten();
      
        let convIndex = tf.transpose(tf.stack([gridIndexV, gridIndexH]));
        convIndex = tf.reshape(convIndex, [gridSize[0], gridSize[1], 1, 2])
        convIndex = tf.cast(convIndex, modelOutput.dtype);
      
        modelOutput = tf.reshape(modelOutput, [gridSize[0], gridSize[1], numberOfAnchorBoxes, numClasses + 5]);
        gridSize = tf.cast(tf.reshape(tf.tensor1d(gridSize), [1,1,1,2]), modelOutput.dtype);
        const inputSize:tf.Tensor4D = tf.cast(tf.tensor4d([height,width], [1,1,1,2]), modelOutput.dtype);
      
        let boxPosition = tf.sigmoid(modelOutput.slice([0,0,0,0], [gridSizeV, gridSizeH, numberOfAnchorBoxes, 2]))
        let boxSize = tf.exp(modelOutput.slice([0,0,0,2], [gridSizeV, gridSizeH, numberOfAnchorBoxes, 2]))
        const boxConfidence = tf.sigmoid(modelOutput.slice([0,0,0,4], [gridSizeV, gridSizeH, numberOfAnchorBoxes, 1]))

        /* changed in yolo v3 */
        // const boxClassProbs = tf.softmax(modelOutput.slice([0,0,0,5],[gridSizeV, gridSizeH, numberOfAnchorBoxes, numClasses]));
        const boxClassProbs = tf.sigmoid(modelOutput.slice([0,0,0,5],[gridSizeV, gridSizeH, numberOfAnchorBoxes, numClasses]));
      
        // Adjust preditions to each spatial grid point and anchor size
        boxPosition = tf.div(tf.add(boxPosition, convIndex), gridSize);
        boxSize = tf.div(tf.mul(boxSize, anchorsTensor), inputSize);
      
        return [ boxPosition, boxSize, boxConfidence, boxClassProbs ];
    }

    /**
     * Convert box predictions to bounding box corners
     * @param boxPosition 
     * @param boxSize 
     */
    public static boxesToCorners(boxPosition, boxSize) {
        const two = tf.tensor1d([2.0]);
        const boxMins = tf.sub(boxPosition, tf.div(boxSize, two));
        const boxMaxes = tf.add(boxPosition, tf.div(boxSize, two));
      
        const dim0 = boxMins.shape[0];
        const dim1 = boxMins.shape[1];
        const dim2 = boxMins.shape[2];
        const size = [dim0, dim1, dim2, 1];
      
        return tf.concat([
          boxMins.slice([0, 0, 0, 1], size),
          boxMins.slice([0, 0, 0, 0], size),
          boxMaxes.slice([0, 0, 0, 1], size),
          boxMaxes.slice([0, 0, 0, 0], size),
        ], 3);
    }
    public static boxesToCorners3(boxPosition, boxSize) {
        const two = tf.scalar(2.0,'float32');
        const boxMins = tf.sub(boxPosition, tf.div(boxSize, two));
        const boxMaxes = tf.add(boxPosition, tf.div(boxSize, two));
      
        const dim0 = boxMins.shape[0];
        const dim1 = boxMins.shape[1];
        const dim2 = boxMins.shape[2];
        const size = [dim0, dim1, dim2, 1];
      
        return tf.concat([
          boxMins.slice([0, 0, 0, 1], size),
          boxMins.slice([0, 0, 0, 0], size),
          boxMaxes.slice([0, 0, 0, 1], size),
          boxMaxes.slice([0, 0, 0, 0], size),
        ], 3);
    }

    public static async NMS(boxesTensor:Tensor, scoresTensor:Tensor, classesTensor:Tensor,iouThreshold:number,scoresThres:number) {
        console.log(boxesTensor.shape,scoresTensor,classesTensor,iouThreshold);
        const [boxes,scores,classes]:Array<Float32Array|Int32Array|Uint8Array> = await Promise.all([
            boxesTensor.data(),
            scoresTensor.data(),
            classesTensor.data(),
        ]);

        console.log(boxes,scores,classes)
        const zipped = [];
        for (let i=0; i<scores.length; i++) {
          zipped.push([
            scores[i], [boxes[4*i], boxes[4*i+1], boxes[4*i+2], boxes[4*i+3]], classes[i],
          ]);
        }
        // Sort by descending order of scores (first index of zipped array)
        const sortedBoxes = zipped.sort((a, b) => b[0] - a[0]);
      
        // const selectedBoxes = [];
        const selectedBoxes = [];
      
        // Greedily go through boxes in descending score order and only
        // return boxes that are below the IoU threshold.
        for( const box of sortedBoxes) {
            if(box[0] < scoresThres ) { break };
            let add = true;
            for( const sel of selectedBoxes) {
                const inter = ModelOutputUtil.boxIntersection(box[1],sel[1])
                const union = ModelOutputUtil.boxUnion(box[1],sel[1])
                if (((inter/union) > iouThreshold)) {
                    add = false;
                    break;
                }
            }

            if (add) {
                selectedBoxes.push(box)
            }
        };

        const detected:IDetection[] = selectedBoxes.map(box => {
                return {
                    box: new Rect(box[1][0],box[1][1],box[1][2],box[1][3]),
                    class: box[2],
                    score: box[0]
                };
        });
        console.log("after nms", detected);
        return detected
    }

    public static boxIntersection(a, b) {
        const w = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
        const h = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
        if (w < 0 || h < 0) {
            return 0;
        }
        return w * h;
    }
    
    public static boxUnion(a, b) {
        const i = ModelOutputUtil.boxIntersection(a, b);
        return (a[3] - a[1]) * (a[2] - a[0]) + (b[3] - b[1]) * (b[2] - b[0]) - i;
    }
    
    public static boxIou(a, b) {
        return ModelOutputUtil.boxIntersection(a, b) / ModelOutputUtil.boxUnion(a, b);
    }

    public static translateBoxes(boxes:Tensor,x:number,y:number) {
        console.log("old boxes: " + boxes.shape);
        const newBoxes:Tensor = boxes.add(tf.tensor1d([y,x,y,x]))
        console.log("new boxes: " + newBoxes.shape);
        return boxes;
        // return boxes.add(tf.tensor1d([y,x,y,x]));
    }

    public static filterBoxes(boxes, boxConfidence, boxClassProbs, threshold) {
        const boxScores = tf.mul(boxConfidence, boxClassProbs);
        const boxClasses = tf.argMax(boxScores, -1);
        const boxClassScores = tf.max(boxScores, -1);
      
        // Many thanks to @jacobgil
        // Source: https://github.com/ModelDepot/tfjs-yolo-tiny/issues/6#issuecomment-387614801
        const predictionMask = tf.greaterEqual(boxClassScores, tf.scalar(threshold)).as1D();
      
        const N = predictionMask.size
        // linspace start/stop is inclusive.
        const allIndices = tf.linspace(0, N - 1, N).toInt();
        const negIndices = tf.zeros([N], 'int32');
        const indices:any = tf.where(predictionMask, allIndices, negIndices);
      
        return [
          tf.gather(boxes.reshape([N, 4]), indices),
          tf.gather(boxClassScores.flatten(), indices),
          tf.gather(boxClasses.flatten(), indices),
        ];
    }
}