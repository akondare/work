import * as React from "react"

interface IProps {
    title: string,
    enabled: boolean,
    elemStrings: string[],
    elemsEnabled: boolean[],
    handler: (i: number, val: boolean) => void
}

interface IState {
    open: boolean
}

export default class DropDown extends React.Component<IProps, IState> {
    protected handlers: any[][];

    public constructor(props: IProps) {
        super(props);
        this.state = { open: false };
        this.toggleMenu = this.toggleMenu.bind(this);
        this.handlers = [
            this.props.elemStrings.map((_,i) => ()=>this.props.handler(i,true)),
            this.props.elemStrings.map((_,i) => ()=>this.props.handler(i,false)),
        ];
    }

    public toggleMenu() {
        if(this.props.enabled) {
                            this.setState({ open: !this.state.open })
                        }
                        else if(this.state.open === true) {
                            this.setState({ open: false })
                        }
                        }
                    
    public render() {
                        return  (
            <div className="DropDown">
                            <label className={"Button " + (this.props.enabled ? "Enabled" : "Disabled")} onClick={this.toggleMenu}>{this.props.title}</label>
                            {this.state.open && <ul className="DropDownList">
                                {
                                    this.props.elemStrings.map((e, i) => (
                                        this.props.elemsEnabled[i]
                                            ? <li key={e} className="ListElem Enabled" onClick={this.handlers[1][i]}> { e }</li>
                                            : <li key={e} className="ListElem Disabled" onClick={this.handlers[0][i]}> { e }</li>
                                ))
                            }
                </ul>}
                        </div>
        );
                    }
}