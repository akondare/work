import './App.scss';

import * as React from 'react';

import { Theme } from '@cgsweb/theme';
import { themed } from 'react-themable-hoc';

import Button from '@cgsweb/core/components/Button';
import ButtonGroup from '@cgsweb/core/components/ButtonGroup';
import DropDownMenu, { MenuItem } from '@cgsweb/core/components/DropdownMenu';

import Rect from './types/Rect';
import IDetection from './types/IDetection';
import Models, { IModel } from './Models';
import DetectionWindow from './DetectionWindow';

interface Props {}

interface ThemeProps {
    classNames: {
        app: string;
    };
}

type AllProps = Props & ThemeProps;

interface State {
    modelInd: number;
    classEnabled: boolean[];
    canPickModel: boolean;
    canOpenFile: boolean;
    canSelect: boolean;
    canDetect: boolean;
    selecting: boolean;
    detected: boolean;
}

class App extends React.Component<AllProps, State> {
    protected detWin: DetectionWindow;
    protected fileIn: HTMLInputElement;
    protected imageElement: HTMLImageElement;
    protected models: IModel[] = Models;
    protected model: IModel;
    protected zone: Rect;

    protected predictions: IDetection[];
    protected filename: string;

    constructor(props: AllProps) {
        super(props);

        this.state = {
            modelInd: -1,
            classEnabled: [],
            canPickModel: false,
            canOpenFile: true,
            canSelect: false,
            canDetect: false,
            selecting: false,
            detected: false
        };

        this.loadModel = this.loadModel.bind(this);
        this.loadImage = this.loadImage.bind(this);
        this.detect = this.detect.bind(this);
        this.loadedFile = this.loadedFile.bind(this);
        this.startSelect = this.startSelect.bind(this);
        this.select = this.select.bind(this);
        this.detect = this.detect.bind(this);
        this.getFile = this.getFile.bind(this);
        this.downloadCSV = this.downloadCSV.bind(this);
    }

    public componentWillMount() {
        this.loadModel(0);
    }
    public componentWillUnmount() {
        this.loadModel(-1);
    }

    public loadedFile() {
        this.setState({canOpenFile: true, canSelect: true, detected: false});
        this.detWin.resetSelection();
    }

    public startSelect() {
        this.setState({selecting: !this.state.selecting});
    }

    public render() {
        return (
        <div className={`app ${this.props.classNames.app}`}>
            <div className="container">
                <ButtonGroup vertical={false}>
                    <DropDownMenu
                        disabled={!this.state.canPickModel}
                        isButton={true}
                        title="Pick Model"
                    >
                        {this.getModels()}
                    </DropDownMenu>
                    <Button
                        disabled={!this.state.canOpenFile}
                        onClick={this.getFile}
                    >
                        Open File
                        <input
                            ref={i => this.fileIn = i}
                            style={{display: 'none'}}
                            onChange={this.loadImage}
                            type="file"
                            id="file"
                        />
                    </Button>
                    <DropDownMenu
                        disabled={!this.state.canPickModel}
                        isButton={true}
                        title="Select Classes"
                        scroll={true}
                        scrollHeight={500}
                    >
                        {this.getClasses()}
                    </DropDownMenu>
                    <Button
                        disabled={!this.state.canSelect}
                        onClick={this.startSelect}
                        type={this.state.selecting ? 'default' : null}
                    >
                        Select Region
                    </Button>
                    <Button
                        disabled={!this.state.canDetect || this.state.detected}
                        onClick={this.detect}
                        type={this.state.detected ? 'default' : null}
                    >
                        Detect
                    </Button>
                    <Button
                        disabled={!this.state.detected}
                        onClick={this.downloadCSV}
                    >
                        Download
                    </Button>
                </ButtonGroup>
                <DetectionWindow
                    ref={detWin => {
                            this.detWin = detWin;
                            this.imageElement = detWin ? detWin.image : null;
                    }}
                    detected={this.state.detected}
                    loadedFileHandler={this.loadedFile}
                    selectedRegionHandler={this.select}
                    selecting={this.state.selecting}
                    enabled={this.state.classEnabled}
                    classes={this.model.classes}
                    colors={this.model.classes.map(c => '#000')}
                />
            </div>
        </div>
        );
    }

    private downloadCSV() {
        const a = document.createElement('a');
        let text: string = 'label,score,left,top,width,height\n';
        this.predictions.forEach(p => {
            const [left, top, width, height] = p.box.getArray();
            const score = p.score;
            const classID = p.class;
            text = text.concat(
                `${this.model.classes[classID]},${score.toFixed(2)},${left},${top},${top},${width},${height}\n`
            );
        });
        a.href = window.URL.createObjectURL(new Blob([text], { type: 'text/csv'}));
        a.download = `${this.filename}.csv`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    private getFile() {
        this.fileIn.click();
    }

    private select(rect: Rect) {
        this.zone = rect;
        this.setState({canDetect: true, selecting: false, detected: false});
    }
    private async detect() {
        this.setState({canDetect: false});
        console.log(this.imageElement, this.zone);
        this.predictions = await this.model.detect(this.imageElement, this.zone);
        console.log(this.predictions);
        this.detWin.setPreds(this.predictions);
        this.setState({canDetect: true, detected: true});
    }

    private getModels() {
        return this.models.map((m, i) => {
            return <MenuItem
                toggled={i === this.state.modelInd}
                key={m.title}
                title={m.title}
                onClick={() => {
                    this.setState({canPickModel: false});
                    this.loadModel(i);
                }}
            />;
        });
    }

    private getClasses() {
        const toggleClass = ((i: number) => {
            const enabled = this.state.classEnabled;
            enabled[i] = !enabled[i];
            this.setState({classEnabled: enabled});
        }).bind(this);

        return this.model.classes.map((s, i) => {
            return <MenuItem
                toggled={this.state.classEnabled[i]}
                key={s}
                title={s}
                onClick={() => toggleClass(i)}
            />;
        });
    }
    private loadImage(e: any) {
        if( e.target.files[0] == null ) { return; }
        this.setState({canOpenFile: false});
        const fileURL: string = URL.createObjectURL(e.target.files[0]);
        this.filename = e.target.files[0].name.split('.')[0];
        console.log(this.filename);
        this.imageElement.src = fileURL;
        // this.setState({ isSelectingRegion: false, isRegionSelected: false });
    }
    private async loadModel(i: number) {
        if( this.state.modelInd !== -1 ) { this.model.unload(); }
        if(i !== -1) {
            this.model = this.models[i];
            await this.model.load();
        }
        this.setState({
            modelInd: i,
            classEnabled: this.model.classes.map(() => true),
            canPickModel: true,
            detected: false
        });
        this.predictions = null;
        this.detWin.resetPreds();
    }
}

export default themed(({ colors }: Theme) => ({
    app: {
        color: colors.font,
        backgroundColor: colors.tier1,
        display: 'flex',
        flexDirection: 'row',
    },
    container: {
        marginLeft: '1em',
        width: '100%',
    },
}))(App);
