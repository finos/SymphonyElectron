import { ipcRenderer } from 'electron';
import * as React from 'react';
import { i18n } from '../../common/i18n-preload';

interface IState {
    snipImage: string;
}

const SNIPPING_TOOL_NAMESPACE = 'ScreenSnippet';

export default class SnippingTool extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onDraw: () => this.draw(),
        onHighlight: () => this.highlight(),
        onErase: () => this.erase(),
        onDone: () => this.done(),
    };

    constructor(props) {
        super(props);
        this.state = {
            snipImage: 'Screen-Snippet',
        };
        this.updateState = this.updateState.bind(this);
    }

    /**
     * Renders the Snipping tool
     */
    public render(): JSX.Element {
        const { snipImage } = this.state;
        return (
            <div className='SnippingTool' lang={i18n.getLocale()}>
                <div className='SnippingTool-header'>
                    <div className='SnippingTool-snip-button-draw' onClick={this.eventHandlers.onDraw}>
                        <img className='SnippingTool-snip-button-image' src='../renderer/assets/snip-draw.png'></img>
                    </div>
                    <div className='SnippingTool-snip-button-highlight' onClick={this.eventHandlers.onHighlight}>
                        <img className='SnippingTool-snip-button-image' src='../renderer/assets/snip-highlight.png'></img>
                    </div>
                    <div className='SnippingTool-snip-button-erase' onClick={this.eventHandlers.onErase}>
                        <img className='SnippingTool-snip-button-image' src='../renderer/assets/snip-erase.png'></img>
                    </div>
                </div>
                <div className='SnippingTool-image-container'>
                    <img
                        src={snipImage}
                        alt={i18n.t('Symphony Logo', SNIPPING_TOOL_NAMESPACE)()}
                    />
                </div>
                <div className='SnippingTool-footer'>
                    <button className='SnippingTool-done-button'
                        onClick={this.eventHandlers.onDone}>
                        {i18n.t('Done', SNIPPING_TOOL_NAMESPACE)()}
                    </button>
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        ipcRenderer.on('snipping-tool-data', this.updateState);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('snipping-tool-data', this.updateState);
    }

    /**
     * Sets the app state
     *
     * @param _event
     * @param data {Object} { snipImage }
     */
    private updateState(_event, data: object): void {
        this.setState(data as IState);
    }

    /**
     * Draws annotation on top of an image
     */
    private draw(): void {
        throw new Error('Method not implemented.');
    }

    /**
     * Supports highlighting an image through an annotation
     */
    private highlight() {
        throw new Error('Method not implemented.');
    }

    /**
     * Erases annotations from an image
     */
    private erase() {
        throw new Error('Method not implemented.');
    }

    /**
     * Processes an image after annotations are drawn
     */
    private done() {
        ipcRenderer.send('upload-snippet', this.state.snipImage);
    }

}
