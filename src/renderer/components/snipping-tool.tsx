import { ipcRenderer } from 'electron';
import * as React from 'react';
import { i18n } from '../../common/i18n-preload';

interface IState {
  snipImage: string;
  height: number;
  width: number;
}

interface IProps {
  drawEnabled: boolean;
  highlightEnabled: boolean;
  eraseEnabled: boolean;
}

const SNIPPING_TOOL_NAMESPACE = 'ScreenSnippet';

export default class SnippingTool extends React.Component<IProps, IState> {
  private readonly eventHandlers = {
    onDraw: () => this.draw(),
    onHighlight: () => this.highlight(),
    onErase: () => this.erase(),
    onDone: () => this.done(),
    onUndo: () => this.undo(),
    onRedo: () => this.redo(),
    onClear: () => this.clear(),
  };

  constructor(props) {
    super(props);
    this.state = {
      snipImage: 'Screen-Snippet',
      height: 600,
      width: 800,
    };
    this.updateState = this.updateState.bind(this);
  }

  /**
   * Renders the Snipping tool
   */
  public render(): JSX.Element {
    const { snipImage, width, height } = this.state;
    return (
      <div className='SnippingTool' lang={i18n.getLocale()}>
        <header>
          <div className='DrawActions'>
            <button
              className={
                this.props.drawEnabled ? 'ActionButtonSelected' : 'ActionButton'
              }
              onClick={this.eventHandlers.onDraw}
            >
              <img src='../renderer/assets/snip-draw.svg' />
            </button>
            <button
              className={
                this.props.highlightEnabled
                  ? 'ActionButtonSelected'
                  : 'ActionButton'
              }
              onClick={this.eventHandlers.onHighlight}
            >
              <img src='../renderer/assets/snip-highlight.svg' />
            </button>
            <button
              className={
                this.props.eraseEnabled
                  ? 'ActionButtonSelected'
                  : 'ActionButton'
              }
              onClick={this.eventHandlers.onErase}
            >
              <img src='../renderer/assets/snip-erase.svg' />
            </button>
          </div>
          <div className='ClearActions'>
            <button
              className='ActionButton'
              onClick={this.eventHandlers.onUndo}
            >
              <img src='../renderer/assets/snip-undo.svg' />
            </button>
            <button
              className='ActionButton'
              onClick={this.eventHandlers.onRedo}
            >
              <img src='../renderer/assets/snip-redo.svg' />
            </button>
            <button
              className='ClearButton'
              onClick={this.eventHandlers.onClear}
            >
              {i18n.t('Clear', SNIPPING_TOOL_NAMESPACE)()}
            </button>
          </div>
        </header>

        <main>
          <img
            src={snipImage}
            width={width}
            height={height}
            className='SnippetImage'
            alt={i18n.t('Symphony Logo', SNIPPING_TOOL_NAMESPACE)()}
          />
        </main>

        <footer>
          <button onClick={this.eventHandlers.onDone}>
            {i18n.t('Done', SNIPPING_TOOL_NAMESPACE)()}
          </button>
        </footer>
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

  /**
   * Undo an action
   */
  private undo() {
    throw new Error('Method not implemented');
  }

  /**
   * Redo an action
   */
  private redo() {
    throw new Error('Method not implemented.');
  }

  /**
   * Clears all annotations from an image
   */
  private clear() {
    throw new Error('Method not implemented');
  }
}
