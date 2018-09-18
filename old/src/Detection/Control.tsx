import * as React from "react"
import Button from "./Options/Button"
import DropDown from "./Options/DropDown"
import FileInput from "./Options/FileInput"

interface IProps {
    classStrings:string[]
    classSelected:boolean[]
    modelStrings:string[]
    modelSelected:boolean[]
    optionsEnabled:boolean[],
    optionHandlers:Array<()=>any>
}

export default function(props:IProps){
    const [modelHandler,fileHandler,classHandler,selectHandler,detectHandler] = props.optionHandlers;
    const [modelEnabled,fileEnabled,classEnabled,selectEnabled,selectToggled,detectEnabled] = props.optionsEnabled;

    return  ( 
        <div className="Control">
            <DropDown title="Model" enabled={modelEnabled} handler={modelHandler} elemStrings={props.modelStrings} elemsEnabled={props.modelSelected} />
            <FileInput title="File" enabled={fileEnabled} handler={fileHandler} />
            <DropDown title="Classes" enabled={classEnabled} handler={classHandler} elemStrings={props.classStrings} elemsEnabled={props.classSelected} />
            <Button title="Select Region" enabled={selectEnabled} handler={selectHandler} toggle={selectToggled}/>
            <Button title="Detect" enabled={detectEnabled} handler={detectHandler}/>
        </div> 
    );
};