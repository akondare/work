# Object Detection Web App

This is a React/Typescript Web Application that allows you to run object detection neural networks in the browser using [TensorFlow.js](https://js.tensorflow.org).

## Models
Currently supports:
- yolov2 : [yad2k](https://github.com/allanzelener/YAD2K)
- yolov3 : [keras-yolo3](https://github.com/qqwweee/keras-yolo3)
- [TensorFlow Object Detection API](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/detection_model_zoo.md) models :
    - SSD
    - Faster R-CNN
    - R-FCN

## Setup
1. Convert to tfjs model format using [tfjs-converter](https://github.com/tensorflow/tfjs-converter)
2. Host model and weight shards online under same url path
3. Create model in `src/Models/index.tsx` based on model type

## Tensorflow.js Primer
Consult [API](https://js.tensorflow.org/api/0.13.0/) for more specifics: 

All Tensorflow Saved/Frozen Models are converted to `tf.FrozenModel` which can be executed using `tf.execute` or `tf.executeAsync` depending on existence of dynamic/control-flow ops

All Keras Models are converted to `tf.Model` which can be executed using `tf.predict` 

The creation of Tensors requires disposal after use using `tf.dispose`. Surrounding code in `tf.tidy` 