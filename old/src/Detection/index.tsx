import * as tf from '@tensorflow/tfjs';
import * as React from "react";
import Classes from "./Classes"
import Config from "./Config"
import Control from "./Control"
import DetectUtil from "./DetectUtil"
import DrawToCanvas from "./Utils/DrawToCanvas";
import IDetection from "./Utils/IDetection"
import { Rect } from "./Utils/Rect"

interface ISize {
    w: number,
    h: number
}
interface IState {
    isModelLoaded: boolean,
    isFileLoaded: boolean,
    isDetecting: boolean,
    hasDetected: boolean,
    isSelectingRegion: boolean,
    isRegionSelected: boolean,
    size:ISize,
    enabled:boolean[]
    modelInd:number
};

export default class Detection extends React.Component<{}, IState>{

    protected modelStrings:string[] = Config.modelNames;
    protected model: (tf.Model|tf.FrozenModel) = null;

    /* class related structures (define classes of model in Classes.js)
        classes - strings of object classes
        enabled - whether or not each class detection is enabled
        colors - the colors used to view classes 
    */
    protected classes: string[] = Classes[Config.version]; // .slice(0,Config.classNo);
    protected colors: string[] = Classes[0].map(_ => (
        "rgb(" + Math.round(Math.random() * 255) + "," + Math.round(Math.random() * 255) + "," + Math.round(Math.random() * 255) + ")"
    ));

    /* holds transformations relative to loaded image 
        trans - the top left cornner of the canvas relative to pixel (0,0) of the original image
        scale - the scale of the current view relative to zoomed-out canvas view
        origScale - the scale of the zoomed-out canvas view relative to the original image
    */
    protected trans: number[] = [0, 0];
    protected scale: number = 1;
    protected origScale: number = null;

    /* state of canvas
        imageElement - current image file loaded
        imageCanvas - canvas that image is drawn to 
        zoneCanvas - canvas, overlaying the imageCanvas, where zone and its predictions are drawn to 
        canvasRect - pixel coordinates of the top left corner of the canvases relative to the client window
    */
    protected imageElement: HTMLImageElement = new Image();
    protected imageCanvas: HTMLCanvasElement;
    protected zoneCanvas: HTMLCanvasElement;
    protected canvasSize = {x:0,y:0}
    protected canvasRect: number[] = [0,0];

    /* state of detection
        selectedZone - (x,y,w,h) of rectangle selected for detection relative to the canvas image
        model - tf model loaded by tfjs from Config.ModelPath upon component mount
        predictions - holds list of bounding boxes (x,y,w,h) per class  
    */
    protected selectedZone: Rect;
    protected predictions: IDetection[][];

    protected maxDim = 800;

    /* State of user interaction with canvas 
        start - (x,y) of starting position as mouse presses down on canvas
        prev - (x,y) of previous point as mouse drags over canvas
    */
    protected startX = -1;
    protected startY = -1;
    protected prevX = -1;
    protected prevY = -1;

    protected width:number= 0;
    protected height:number = 0;

    /* event handlers to pass along to Control Component 
        openFile - opens file 
        changeClasses - toggle detection of class
        selectRegion - toggle using mouse to select region once file is loaded
        detect - run detection on selectd region once model is loaded
    */
    protected optionHandlers: Array<(...args: any[]) => void> = [
        function changeModel(i: number,addOrRemove:boolean) {
            if(this.modelInd === i) {return};

            this.disposeModel();
            this.loadModel(i);
        },
        function openFile(e: any) {
            if( e.target.files[0] == null ) {return};
            const fileURL: string = URL.createObjectURL(e.target.files[0]);
            this.imageElement.src = fileURL;
            this.setState({ isSelectingRegion: false, isRegionSelected: false });
            this.trans = [0, 0];
            this.scale = 1;
            this.origScale = -1;
        },
        function changeClasses(i: number, addOrRemove: boolean) {
            const newEnabled:boolean[] = this.state.enabled; 
            newEnabled[i] = addOrRemove;
            if(this.state.hasDetected) {
                this.drawPredsToZone();
            }
            this.setState({enabled: newEnabled});
        },
        function selectRegion(e: any) {
            if (this.state.isSelectingRegion === false) {
                this.setState({ isSelectingRegion: true });
            }
            else {
                this.setState({ isSelectingRegion: false });
            }
        },
        function detect(e: any) {
            this.detect();
        },
    ];

    constructor(props: {}) {
        super(props);

        // set all booleans to false since nothing has occured yet and set empty canvas to size of (0,0)
        this.state = {
            enabled: Classes[Config.version].map(_ => true),
            hasDetected: false,
            isDetecting: false,
            isFileLoaded: false,
            isModelLoaded: false,
            isRegionSelected: false,
            isSelectingRegion: false,
            modelInd: Config.version,
            size: {w:0,h:0},
        };

        /* bind all functions called by event handlers */
        this.optionHandlers = this.optionHandlers.map(h => h.bind(this));
        this.loadImage = this.loadImage.bind(this);
        this.setTrans = this.setTrans.bind(this);
        this.mouseDown = this.mouseDown.bind(this)
        this.mouseUp = this.mouseUp.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.zoom = this.zoom.bind(this);
        this.drawZone = this.drawZone.bind(this)
        this.detect = this.detect.bind(this)
        this.onLeave = this.onLeave.bind(this)
        this.loadModel = this.loadModel.bind(this)
    }

    // loads model from Config.ModelPath asynchronously
    public async loadModel(i:number) {
        // tf.setBackend('cpu'); 
        // tf.ENV.set('DEBUG',true);
        console.log(Config.configs[i].path)
        const path:string = Config.configs[i].path;
        const weightsPath:string = Config.configs[i].weights;
        if( weightsPath != null) {
            console.log('frozen')
            this.model = await tf.loadFrozenModel(path,weightsPath);
        }
        else {
            // console.log(path)
            this.model = await tf.loadModel(path);
        }
        this.classes = Classes[i];
        this.setState({ modelInd:i,isModelLoaded: true,enabled:Classes[i].map(_ => true) });
        // console.log(this.state.modelInd,this.model);
    }
    public async disposeModel() {
        this.model = null;
        tf.disposeVariables();
    }

    /*  componentDidMount() 
            Upon component being mounted, start loading the model asynchronously, and add event handler to load image to canvas upon availability
    */
    public async componentWillMount() {
        this.loadModel(Config.version)
        this.imageElement.addEventListener('load', this.loadImage);
    }
    public async componentWillUnmount() {
        this.disposeModel();
        this.imageElement.removeEventListener('load', this.loadImage);
    }

    public render() {

        // recalculate whether each option is currently enabled based upon the state of the detector
        const optionsEnabled: boolean[] = [
            true,
            true,// this.state.isModelLoaded,
            true,
            this.state.isFileLoaded,
            this.state.isSelectingRegion,
            this.state.isRegionSelected && this.state.isSelectingRegion === false && this.state.hasDetected === false && this.state.isModelLoaded
        ];

        const modelSelected:boolean[] = this.modelStrings.map((s,i) => false);
        modelSelected[this.state.modelInd] = true;

        // pass information, event handlers, and optionsEnabled array to Control component 
        const controlProps: any = {
            classSelected: this.state.enabled,
            classStrings: this.classes.slice(0,Config.configs[this.state.modelInd].numOfClasses),
            modelSelected,
            modelStrings: this.modelStrings,
            optionHandlers: this.optionHandlers,
            optionsEnabled,
        }

        // render Header with title and control component along with div holding canvases
        return (
            <div className="Detection">
                <header className="Header">
                    <h1 className="Title">Object Detector</h1>
                    <Control {...controlProps} />
                </header>
                <div className="Canvases" style={{ height: this.state.size.h, width: this.state.size.w }}>
                    <canvas className="ImageCanvas" ref={ref => this.imageCanvas = ref} />
                    <canvas className="ZoneCanvas" ref={ref => this.zoneCanvas = ref} onMouseDown={this.mouseDown} onWheel={this.handleScroll} />
                </div>
            </div>
        );
    }


    // draw zone to canvas as it is being selected with respect to current view only
    protected drawZone(endX: number, endY: number) {
        DrawToCanvas.clearCanvas(this.zoneCanvas);

        this.selectedZone = new Rect(this.startX, this.startY, endX - this.startX, endY - this.startY);
        DrawToCanvas.drawRect(this.zoneCanvas, this.selectedZone, "#000", 2);

        this.setState({ isSelectingRegion: true });
    }

    // load image to canvas upon availability from file input handler
    protected loadImage() {

        // original size of image
        const fullH: number = this.imageElement.naturalHeight;
        const fullW: number = this.imageElement.naturalWidth;

        // set size of image on canvas based off of maximum dimensions allowed
        const ratio: number = fullH / fullW;
        let canvasH: number;
        let canvasW: number;
        if (fullW > fullH) {
            this.origScale = fullW / this.maxDim;
            canvasW = this.maxDim;
            canvasH = this.maxDim * ratio;
        }
        else {
            this.origScale = fullH / this.maxDim;
            canvasW = this.maxDim / ratio;
            canvasH = this.maxDim;
        }

        // draw image to canvas
        this.imageCanvas.width = canvasW;
        this.imageCanvas.height = canvasH;
        this.zoneCanvas.width = canvasW;
        this.zoneCanvas.height = canvasH;
        this.setState({size:{w:canvasW, h:canvasH}});
        this.imageCanvas.getContext('2d').drawImage(this.imageElement, 0, 0, canvasW, canvasH);

        // record position of canvas relative to client window
        const cRect:ClientRect = this.zoneCanvas.getBoundingClientRect();
        this.canvasRect = [cRect.left, cRect.top,cRect.right-cRect.left,cRect.bottom-cRect.top]

        // delete memory of object url of original file as it has been loaded into the image element
        URL.revokeObjectURL(this.imageElement.src);

        // image loading complete
        this.setState({ isFileLoaded: true });
    }

    protected mouseDown(event: any) {
        if (this.state.isSelectingRegion) {
            this.startX = (event.clientX - this.canvasRect[0])
            this.startY = (event.clientY - this.canvasRect[1])
        }
        else {
            this.prevX = event.clientX;
            this.prevY = event.clientY;
        }
        event.target.addEventListener('mousemove', this.mouseMove);
        event.target.addEventListener('mouseup', this.mouseUp);
        event.target.addEventListener('mouseleave', this.onLeave);
    }
    protected mouseMove(event: any) {
        if (this.state.isSelectingRegion) {
            const endX: number = (event.clientX - this.canvasRect[0])
            const endY: number = (event.clientY - this.canvasRect[1])
            this.drawZone(endX, endY);
        }
        else {
            this.translate(event.clientX - this.prevX, event.clientY - this.prevY)
            this.prevX = event.clientX;
            this.prevY = event.clientY;
        }
    }
    protected mouseUp(event: any) {
        if (this.state.isSelectingRegion) {
            this.finalizeZone();
        }
        event.target.removeEventListener('mousemove', this.mouseMove);
        event.target.removeEventListener('mouseup', this.mouseUp);
        event.target.removeEventListener('mouseleave', this.onLeave);
    }
    protected handleScroll(event: any) {
        this.zoom(event.deltaY < 0, event.clientX - this.canvasRect[0], event.clientY - this.canvasRect[1])
    }


    protected setTrans(x, y, factor) {
        this.trans[0] = Math.max(0, Math.min(this.imageCanvas.width * (1 - this.scale), this.trans[0] + (x * factor)));
        this.trans[1] = Math.max(0, Math.min(this.imageCanvas.height * (1 - this.scale), this.trans[1] + (y * factor)));
        DrawToCanvas.clearCanvas(this.imageCanvas);
        // DrawToCanvas.clearCanvas(this.zoneCanvas);
        const ctx: CanvasRenderingContext2D = this.imageCanvas.getContext('2d');
        ctx.save();
        ctx.scale(1 / this.scale, 1 / this.scale)
        ctx.translate(-this.trans[0], -this.trans[1])
        ctx.drawImage(this.imageElement, 0, 0, this.imageCanvas.width, this.imageCanvas.height);
        ctx.restore();
        this.drawPredsToZone();
    }
    protected translate(dx, dy) {
        if (dx === 0 && dy === 0) { return };
        this.setTrans(-dx, -dy, this.scale)
    }
    protected zoom(isZoomIn: boolean, x: number, y: number) {
        if (this.scale < 0.05 && isZoomIn === true) { return };
        if (this.scale === 1 && isZoomIn === false) { return };
        const diff = isZoomIn ? -0.05 : 0.05;
        this.scale += diff;
        this.setTrans(x, y, -diff);
    }
    protected finalizeZone() {
        let [x, y, w, h] = this.selectedZone.getDetails();
        if (w < 0) {
            x = x + w;
            w = -w;
        }
        if (h < 0) {
            y = y + h;
            h = -h;
        }

        this.selectedZone.left = this.trans[0] + (x * this.scale)
        this.selectedZone.top = this.trans[1] + (y * this.scale)
        this.selectedZone.width = (w * this.scale)
        this.selectedZone.height = (h * this.scale)

        this.setState({ isSelectingRegion: false, isRegionSelected: true, hasDetected: false });
    }

    protected getPixelData(x, y, w, h):tf.Tensor4D {
        console.log("REGION :  ",x,y,w,h)
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        const context: CanvasRenderingContext2D = canvas.getContext('2d');
            
        const size = Config.configs[this.state.modelInd].size;


        if(size.width == null || size.height == null) {
            if( false ) {
                size.width = w-(w%32);
                size.height = h-(h%32);
            } else {
                size.width = w;
                size.height = h;
            }
        }

        canvas.width = size.width;
        canvas.height = size.height;
        context.drawImage(this.imageElement,x,y,w,h,0,0,size.width,size.height)
        // console.log(context.getImageData(0,0,size.width,size.height));

        return tf.fromPixels(context.getImageData(0,0,size.width,size.height))
                 .expandDims(0)
                 // .toFloat()
                 // .div(tf.scalar(255));

    }

    protected async predict(zone: Rect) {

        const [x,y,w,h] = [
            Math.floor(zone.left * this.origScale),
            Math.floor(zone.top * this.origScale),
            Math.ceil(zone.width * this.origScale),
            Math.ceil(zone.height * this.origScale),
        ];
        // const newZone:Rect = new Rect(x,y,w,h)

        const a = performance.now();
        const imageData: tf.Tensor4D = tf.tidy(() => this.getPixelData(x, y, w, h));
        const width:number = imageData.shape[2]
        const height:number = imageData.shape[1]
        const config = Config.configs[this.state.modelInd]
        const preds:IDetection[] =  await DetectUtil[config.type](this.model,imageData,config);
        imageData.dispose();
        const b = performance.now();
        console.log(alert('It took ' + (b - a) + ' ms.'));
        return this.getFinalPreds(
            preds,
            Config.configs[this.state.modelInd].probThreshold,
            zone,
            width,
            height
        );
    }
    protected getFinalPreds(preds:IDetection[],probThres:number,zone:Rect,width:number,height:number) {
        const ratioX = zone.width / width;
        const ratioY = zone.height / height;
        console.log(ratioX, ratioY)
        const results:IDetection[][] = Array<IDetection[]>(this.classes.length); 
        for(let i=0; i<results.length;i++) { results[i] = [] }
        preds.forEach(p => {
            const [top,left,bottom,right] = p.box.getDetails();
            const prob = p.score;
            const classId = p.class;

            if (prob < probThres) {
                return
            }

            const leftOffset = Math.max(0, left) * ratioX;
            const topOffset = Math.max(0, top) * ratioY;
            const w = Math.min(width, right * ratioX) - leftOffset;
            const h = Math.min(height, bottom * ratioY) - topOffset;

            const nextObject:IDetection = {
                box: new Rect(leftOffset+zone.left, topOffset+zone.top, w, h),
                class: classId,
                score: prob,
            };

            results[classId].push(nextObject);

            console.log(this.classes[nextObject.class],nextObject.score,nextObject.box.scale(this.origScale))
        });

        return results;
    }

    protected drawPredsToZone() {
        if (this.state.isRegionSelected === false) { return }
        DrawToCanvas.clearCanvas(this.zoneCanvas);
        const ctx: CanvasRenderingContext2D = this.zoneCanvas.getContext('2d');
        ctx.save();

        ctx.scale(1 / this.scale, 1 / this.scale)
        ctx.translate(-this.trans[0], -this.trans[1])

        DrawToCanvas.drawRect(this.zoneCanvas, this.selectedZone, "#000", 2);
        if (this.state.hasDetected === true) {
            this.state.enabled.forEach((e, i) => {
                if (e) {
                    this.predictions[i].forEach((prediction: IDetection) => {
                        DrawToCanvas.drawPredictionRect(this.zoneCanvas, this.classes[i], prediction, 2, this.colors[i], 12);
                    })
                }
            });
        }

        ctx.restore();
    }

    protected async detect() {
        this.setState({ isDetecting: true });
        this.forceUpdate();

        if (!this.state.hasDetected) {
            this.predictions = await this.predict(this.selectedZone);
            this.setState({ hasDetected: true })
        }

        this.drawPredsToZone();
        this.setState({ isDetecting: false });
        this.forceUpdate();
    }

    protected onLeave(event: any) {
        if (this.state.isSelectingRegion) {
            const endX: number = Math.min(this.canvasRect[2],(event.clientX - this.canvasRect[0]))
            const endY: number = Math.min(this.canvasRect[3],(event.clientY - this.canvasRect[1]));
            this.drawZone(endX, endY);
            this.finalizeZone();
        }
        event.target.removeEventListener('mousemove', this.mouseMove);
        event.target.removeEventListener('mouseup', this.mouseUp);
        event.target.removeEventListener('mouseleave', this.onLeave);
    };


}
                    // <canvas className="ZoneCanvas" ref = {ref => this.zoneCanvas = ref}/> //onMouseDown={this.startSelect} onMouseUp={this.endSelect}/>