import * as React from 'react';
import IDetection from './types/IDetection';
import Rect, { IRect } from './types/Rect';
import { IPoint } from './types/Point';

interface WindowDims {
    width: number;
    height: number;
}

interface IProps {
    loadedFileHandler: () => void;
    selectedRegionHandler: (rect: Rect) => void;
    selecting: boolean;
    detected: boolean;
    enabled: boolean[];
    classes: string[];
    colors: string[];
}
interface IState {
    styles: WindowDims;
}

export default class DetectionWindow extends React.Component<IProps, IState> {
    protected imageCanvas: HTMLCanvasElement;
    public image: HTMLImageElement = new Image();

    public origScale = 1; // scale of image relative to the size of the original image file
    protected transform = [0, 0, 1]; // transforms of current image view relative to zoomed out image
    protected changeStart = [0, 0];

    protected zoneCanvas: HTMLCanvasElement;
    protected selected: boolean = false;

    protected regionStart: [number, number] = [-1, -1];
    protected selectedZone: Rect = null;

    protected predictions: IDetection[][] | null = null;

    // related to configuration of canvases in window
    protected maxDim = 800;
    protected canvasRect: [number, number, number, number] = [-1, -1, -1, -1];

    public constructor(props) {
        super(props);
        this.loadImage = this.loadImage.bind(this);
        this.state = {
            styles: {
                width: 0,
                height: 0,
            }
        };

        this.mouseDown = this.mouseDown.bind(this);
        this.mouseLeave = this.mouseLeave.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.drawZone = this.drawZone.bind(this);
        this.loadImage = this.loadImage.bind(this);
        this.setTrans = this.setTrans.bind(this);
        this.zoom = this.zoom.bind(this);
        this.image.crossOrigin = 'anonymous';
    }

    public componentWillMount() {
        this.image.addEventListener('load', this.loadImage);
    }
    public componentWillUnmount() {
        this.image.removeEventListener('load', this.loadImage);
    }
    public render() {
        const {width, height} = this.state.styles;
        const style = { width: width + 10,
                        height: height + 10,
                        position: 'absolute' as 'absolute',
                        margin: 0,
                        padding: 0
                    };
        const parentStyle = {
                display: 'flex',
                flexDirection: 'column' as 'column',
                flexWrap: 'nowrap' as 'nowrap',
                margin: 'auto',
                padding: 'auto',
                width: this.maxDim,
                height: this.maxDim,
        };
        return (
            <div style={parentStyle} className="DetView">
                <canvas style={{...style, zIndex: 0}} className="ImageView" ref={ref => this.imageCanvas = ref}/>
                <canvas
                    style={{...style, zIndex: 1, borderColor: 'darkGray',
                            borderWidth: (this.state.styles.width === 0 ? 0 : 5), borderStyle: 'solid'}}
                    className="ZoneView"
                    ref={ref => this.zoneCanvas = ref}
                    onMouseDown={this.mouseDown}
                    onWheel={this.onWheel}
                />
            </div>
        );
    }

    public resetSelection() {
        this.selected = false;
        this.selectedZone = null;
    }

    public setPreds(regPreds: IDetection[]) {
        // init array of arrays
        const results: IDetection[][] = Array<IDetection[]>(this.props.classes.length);
        for(let i = 0; i < results.length; i++) { results[i] = []; }

        // add all preds
        regPreds.forEach(p => {
            const nextObject: IDetection = {
                box: p.box.scale(1 / this.origScale),
                class: p.class,
                score: p.score,
            };
            results[p.class].push(nextObject);
        });

        console.log('results to draw', results);
        this.predictions = results;
        this.drawPredsToZone();
    }

    private mouseDown(event: any) {
        // record position of canvas relative to client window
        const cRect: ClientRect = this.imageCanvas.getBoundingClientRect();
        this.canvasRect = [cRect.left + 5, cRect.top + 5, cRect.right - cRect.left, cRect.bottom - cRect.top];

        if (this.props.selecting) {
            this.regionStart = [
                event.clientX - this.canvasRect[0],
                event.clientY - this.canvasRect[1],
            ];
        } else {
            this.changeStart = [event.clientX, event.clientY];
        }
        event.target.addEventListener('mousemove', this.mouseMove);
        event.target.addEventListener('mouseup', this.mouseUp);
        event.target.addEventListener('mouseleave', this.mouseLeave);
    }
    private mouseMove(event: any) {
        if (this.props.selecting) {
            const endX: number = (event.clientX - this.canvasRect[0]);
            const endY: number = (event.clientY - this.canvasRect[1]);
            this.drawZone(endX, endY);
        } else {
            this.translate(event.clientX - this.changeStart[0], event.clientY - this.changeStart[1]);
            this.changeStart = [event.clientX, event.clientY];
        }
    }
    private mouseUp(event: any) {
        if (this.props.selecting) {
            this.finalizeZone();
        }
        event.target.removeEventListener('mousemove', this.mouseMove);
        event.target.removeEventListener('mouseup', this.mouseUp);
        event.target.removeEventListener('mouseleave', this.mouseLeave);
    }
    private mouseLeave(event: any) {
        if (!this.props.selecting) { return; }

        const endX: number = Math.max(0, Math.min(this.canvasRect[2], (event.clientX - this.canvasRect[0])));
        const endY: number = Math.max(0, Math.min(this.canvasRect[3], (event.clientY - this.canvasRect[1])));
        this.drawZone(endX, endY);
        this.finalizeZone();
        event.target.removeEventListener('mousemove', this.mouseMove);
        event.target.removeEventListener('mouseup', this.mouseUp);
        event.target.removeEventListener('mouseleave', this.mouseLeave);
    }
    // draw zone to canvas as it is being selected with respect to current view only
    private drawZone(endX: number, endY: number) {
        this.clearCanvas(this.zoneCanvas);

        const [startX, startY] = this.regionStart;
        this.selectedZone = new Rect(startX, startY, endX - startX, endY - startY);
        // DetectionWindow.drawRect(this.zoneCanvas, this.selectedZone, '#000', 2);
        DetectionWindow.shadeEverythingButRect(this.zoneCanvas, this.selectedZone);
    }

    private finalizeZone() {
        let [x, y, w, h] = this.selectedZone.getArray();
        if (w < 0) {
            x = x + w;
            w = -w;
        }
        if (h < 0) {
            y = y + h;
            h = -h;
        }

        const [dx, dy, scale] = this.transform;
        this.selectedZone = new Rect(
            dx + (x * scale),
            dy + (y * scale),
            (w * scale),
            (h * scale)
        );
        this.selected = true;
        this.props.selectedRegionHandler( this.selectedZone.scale(this.origScale) );
    }

    private translate(dx: number, dy: number) {
        if (dx === 0 && dy === 0) { return; }
        this.setTrans(-dx, -dy);
    }
    private clearCanvas(canvas) {
        (canvas.getContext('2d') as CanvasRenderingContext2D).clearRect(0, 0, canvas.width, canvas.height);
    }
    public static drawRect(
        canvas: HTMLCanvasElement,
        rect: IRect,
        color: string = '#fff',
        thickness: number = 1
    ): void {
        // preserve context
        const ctx: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.save();

        // set parameters
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;

        // draw rectangle and restore context
        ctx.beginPath();
        ctx.rect(rect.left, rect.top, rect.width, rect.height);
        ctx.stroke();
        ctx.restore();
    }

    public static drawText(
        canvas: HTMLCanvasElement,
        text: string,
        textSize: number,
        anchorPoint: IPoint,
        color: string = '#ffffff',
        bold: boolean = false
    ): void {
        // preserve context
        const ctx: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.save();

        // set parameters
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = (bold ? 'bold ' : '') + textSize + 'px Titillium Web';

        // draw text and restore context
        ctx.fillText(text, anchorPoint.x, anchorPoint.y);
        ctx.restore();
    }

    public static drawPredictionRect(
        canvas: HTMLCanvasElement,
        classString: string,
        prediction: IDetection,
        thickness: number = 1,
        color: string = '#fff',
        textSize: number = 10
    ): void {
        DetectionWindow.drawRect(canvas, prediction.box, color, thickness);

        const ctx: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.save();

        ctx.font = 'bold ' + textSize + 'px Titillium Web';
        const txt = classString + ' ' + prediction.score.toFixed(2);
        const padding = 2;
        const width = ctx.measureText(txt).width;
        ctx.fillStyle = color;
        ctx.textAlign = 'start';
        ctx.textBaseline = 'top';

        ctx.fillRect(prediction.box.left, prediction.box.top, width + padding * 2, textSize + padding * 2);
        ctx.fillStyle = '#fff';
        ctx.fillText(txt, prediction.box.left + padding, prediction.box.top);

        ctx.restore();
    }

    private onWheel(event: any) {
        // record position of canvas relative to client window
        const cRect: ClientRect = this.imageCanvas.getBoundingClientRect();
        this.canvasRect = [cRect.left + 5, cRect.top + 5, cRect.right - cRect.left, cRect.bottom - cRect.top];
        this.zoom(event.deltaY < 0, event.clientX - this.canvasRect[0], event.clientY - this.canvasRect[1]);
    }

    private zoom(isZoomIn: boolean, x: number, y: number) {
        const scale = this.transform[2];
        if ( isZoomIn && scale < 0.05) { return; }
        if ( !isZoomIn && scale === 1) { return; }
        const diff = isZoomIn ? -0.05 : 0.05;
        this.transform[2] += diff;
        this.setTrans(x, y, -diff);
    }

    private setTrans(x: number, y: number, factor?: number) {
        const [transX, transY, scale] = this.transform;
        factor = factor == null ? scale : factor;
        this.transform = [
            Math.max(0, Math.min(this.imageCanvas.width * (1 - scale), transX + (x * factor))),
            Math.max(0, Math.min(this.imageCanvas.height * (1 - scale), transY + (y * factor))),
            scale
        ];
        const [newX, newY] = this.transform;
        this.clearCanvas(this.imageCanvas);
        const ctx: CanvasRenderingContext2D = this.imageCanvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.save();
        ctx.scale(1 / scale, 1 / scale);
        ctx.translate(-newX, -newY);
        ctx.drawImage(this.image, 0, 0, this.imageCanvas.width, this.imageCanvas.height);
        ctx.restore();
        this.drawPredsToZone();
    }
    private static shadeEverythingButRect(
        canvas: HTMLCanvasElement,
        rect: IRect,
        color: string = 'rgba(0, 0, 0, 0.7)'
    ): void {
        const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
        ctx.restore();
    }
    private drawPredsToZone() {
        console.log(this.selected, this.props.detected);
        if (this.selected === false) { return; }
        this.clearCanvas(this.zoneCanvas);
        const [transX, transY, scale] = this.transform;
        const ctx: CanvasRenderingContext2D = this.zoneCanvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.save();
        ctx.scale(1 / scale, 1 / scale);
        ctx.translate(-transX, -transY);

        const thickness = 2 * scale;
        // DetectionWindow.drawRect(this.zoneCanvas, this.selectedZone, '#000', thickness);
        DetectionWindow.shadeEverythingButRect(this.zoneCanvas, this.selectedZone);
        const preds = this.predictions;
        if (this.predictions !== null) {
            this.props.enabled.forEach((e, i) => {
                if (e) {
                    preds[i].forEach((prediction: IDetection) => {
                        DetectionWindow.drawPredictionRect(
                            this.zoneCanvas, this.props.classes[i], prediction, thickness, this.props.colors[i]);
                    });
                }
            });
        }
        ctx.restore();
    }

    private loadImage() {
        // original size of image
        const fullH: number = this.image.naturalHeight;
        const fullW: number = this.image.naturalWidth;

        // set size of image on canvas based off of maximum dimensions allowed
        const ratio: number = fullH / fullW;
        let canvasH: number;
        let canvasW: number;
        if (fullW > fullH) {
            this.origScale = fullW / this.maxDim;
            canvasW = this.maxDim;
            canvasH = this.maxDim * ratio;
        } else {
            this.origScale = fullH / this.maxDim;
            canvasW = this.maxDim / ratio;
            canvasH = this.maxDim;
        }

        // draw image to canvas
        this.transform = [0, 0, 1]; // transforms of current image view relative to zoomed out image
        this.changeStart = [0, 0];
        this.setState({ styles: {width: canvasW, height: canvasH} });
        this.imageCanvas.width = canvasW;
        this.imageCanvas.height = canvasH;
        this.zoneCanvas.width = canvasW;
        this.zoneCanvas.height = canvasH;
        const ctx: CanvasRenderingContext2D = this.imageCanvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.drawImage(this.image, 0, 0, canvasW, canvasH);

        // delete memory of object url of original file as it has been loaded into the image element
        URL.revokeObjectURL(this.image.src);
        this.props.loadedFileHandler();
        // image loading complete
        // this.setState({ isFileLoaded: true });
    }

}