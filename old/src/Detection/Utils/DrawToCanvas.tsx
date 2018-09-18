import IDetection from "./IDetection";
import {IPoint} from "./Point";
import {IRect} from "./Rect";

export default class DrawToCanvas {
    public static setSize(canvas:HTMLCanvasElement, w:number,h:number) {
        canvas.width = w;
        canvas.height = h;
    }

    public static clearCanvas(canvas:HTMLCanvasElement): void {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }

    public static drawRect(canvas:HTMLCanvasElement, rect:IRect, color:string = "#fff", thickness:number = 1): void {
        // preserve context 
        const ctx:CanvasRenderingContext2D = canvas.getContext('2d');
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

    public static drawText(canvas:HTMLCanvasElement, text:string, textSize:number, anchorPoint:IPoint, color:string = "#ffffff", bold:boolean = false):void {
        // preserve context
        const ctx:CanvasRenderingContext2D = canvas.getContext('2d');
        ctx.save();

        // set parameters
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline="middle"; 
        ctx.font = (bold ? "bold " : "") + textSize + "px Titillium Web";

        // draw text and restore context
        ctx.fillText(text, anchorPoint.x, anchorPoint.y); 
        ctx.restore();
    }

    public static drawPredictionRect(canvas:HTMLCanvasElement, classString:string, prediction:IDetection, thickness:number = 1, color:string = "#fff", textSize:number = 10): void {
        DrawToCanvas.drawRect(canvas, prediction.box, color, thickness);

        const ctx:CanvasRenderingContext2D = canvas.getContext('2d');
        ctx.save();

        ctx.font = "bold " + textSize + "px Titillium Web";
        const txt = classString + " " + prediction.score.toFixed(2);
        const padding = 2;
        const width = ctx.measureText(txt).width; 
        ctx.fillStyle = color;
        ctx.textAlign = "start";
        ctx.textBaseline = "top";

        ctx.fillRect(prediction.box.left, prediction.box.top, width + padding * 2, textSize + padding * 2);
        ctx.fillStyle = "#fff";
        ctx.fillText(txt, prediction.box.left + padding, prediction.box.top);

        ctx.restore();
    }
}