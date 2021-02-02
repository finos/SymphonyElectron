import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

const whiteColorRegExp = new RegExp(
  /^(?:white|#fff(?:fff)?|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*1\s*)?\))$/i,
);
const darkTheme = [
  '#e23030',
  '#b5616a',
  '#ab8ead',
  '#ebc875',
  '#a3be77',
  '#58c6ff',
  '#ebab58',
];
type Theme = '' | 'light' | 'dark';

interface IState {
  title: string;
  company: string;
  body: string;
  image: string;
  icon: string;
  id: number;
  color: string;
  flash: boolean;
  isExternal: boolean;
  theme: Theme;
  hasReply: boolean;
  isInputHidden: boolean;
  containerHeight: number;
  canSendMessage: boolean;
}

type mouseEventButton =
  | React.MouseEvent<HTMLDivElement>
  | React.MouseEvent<HTMLButtonElement>;
type keyboardEvent = React.KeyboardEvent<HTMLInputElement>;

// Notification container height
const CONTAINER_HEIGHT = 88;
const CONTAINER_HEIGHT_WITH_INPUT = 120;

export default class NotificationComp extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onClose: (winKey) => (_event: mouseEventButton) => this.close(winKey),
    onClick: (data) => (_event: mouseEventButton) => this.click(data),
    onContextMenu: (event) => this.contextMenu(event),
    onMouseEnter: (winKey) => (_event: mouseEventButton) =>
      this.onMouseEnter(winKey),
    onMouseLeave: (winKey) => (_event: mouseEventButton) =>
      this.onMouseLeave(winKey),
    onOpenReply: (winKey) => (event: mouseEventButton) =>
      this.onOpenReply(event, winKey),
    onThumbsUp: () => (_event: mouseEventButton) => this.onThumbsUp(),
    onReply: (winKey) => (_event: mouseEventButton) => this.onReply(winKey),
    onKeyUp: (winKey) => (event: keyboardEvent) => this.onKeyUp(event, winKey),
  };
  private flashTimer: NodeJS.Timer | undefined;
  private customInput: React.RefObject<HTMLSpanElement>;
  private inputCaret: React.RefObject<HTMLDivElement>;
  private input: React.RefObject<HTMLInputElement>;

  constructor(props) {
    super(props);
    this.state = {
      title: '',
      company: 'Symphony',
      body: '',
      image: '',
      icon: '',
      id: 0,
      color: '',
      flash: false,
      isExternal: false,
      theme: '',
      isInputHidden: true,
      hasReply: false,
      containerHeight: CONTAINER_HEIGHT,
      canSendMessage: false,
    };
    this.updateState = this.updateState.bind(this);
    this.setInputCaretPosition = this.setInputCaretPosition.bind(this);
    this.resetNotificationData = this.resetNotificationData.bind(this);
    this.getInputValue = this.getInputValue.bind(this);

    this.customInput = React.createRef();
    this.inputCaret = React.createRef();
    this.input = React.createRef();
  }

  /**
   * Callback to handle event when a component is mounted
   */
  public componentDidMount(): void {
    ipcRenderer.on('notification-data', this.updateState);
  }

  /**
   * Callback to handle event when a component is unmounted
   */
  public componentWillUnmount(): void {
    ipcRenderer.removeListener('notification-data', this.updateState);
    this.clearFlashInterval();
  }

  /**
   * Renders the component
   */
  public render(): JSX.Element {
    const {
      title,
      body,
      id,
      color,
      isExternal,
      theme,
      isInputHidden,
      containerHeight,
      hasReply,
      canSendMessage,
    } = this.state;
    let themeClassName;
    if (theme) {
      themeClassName = theme;
    } else if (darkTheme.includes(color.toLowerCase())) {
      themeClassName = 'blackText';
    } else {
      themeClassName =
        color && color.match(whiteColorRegExp) ? 'light' : 'dark';
    }

    const bgColor = { backgroundColor: color || '#ffffff' };
    const containerClass = classNames('container', {
      'external-border': isExternal,
    });
    const actionButtonContainer = classNames('rte-button-container', {
      'action-container-margin': !isInputHidden,
    });

    return (
      <div
        className={containerClass}
        style={{ height: containerHeight }}
        lang={i18n.getLocale()}
      >
        <div
          className='main-container'
          role='alert'
          style={bgColor}
          onContextMenu={this.eventHandlers.onContextMenu}
          onClick={this.eventHandlers.onClick(id)}
          onMouseEnter={this.eventHandlers.onMouseEnter(id)}
          onMouseLeave={this.eventHandlers.onMouseLeave(id)}
        >
          <div className='logo-container'>
            <div className='logo'>
              <img
                src='../renderer/assets/notification-symphony-logo.svg'
                alt='Symphony logo'
              />
            </div>
          </div>
          <div className='header'>
            <div className='title-container'>
              <span className={`title ${themeClassName}`}>{title}</span>
              {this.renderExtBadge(isExternal)}
            </div>
            <span className={`message ${themeClassName}`}>{body}</span>
          </div>
          <div className='actions-container'>
            <button
              className={`action-button ${themeClassName}`}
              title={i18n.t('Close')()}
              onClick={this.eventHandlers.onClose(id)}
            >
              {i18n.t('Close')()}
            </button>
            <button
              className={`action-button ${themeClassName}`}
              style={{ visibility: hasReply ? 'visible' : 'hidden' }}
              title={i18n.t('Reply')()}
              onClick={this.eventHandlers.onOpenReply(id)}
            >
              {i18n.t('Reply')()}
            </button>
          </div>
        </div>
        <div
          style={{
            ...{ display: isInputHidden ? 'none' : 'block' },
            ...bgColor,
          }}
          className='rte-container'
        >
          <div className='input-container'>
            <div className='input-border' />
            <div className='input-caret-container'>
              <span ref={this.customInput} className='custom-input' />
            </div>
            <div ref={this.inputCaret} className='input-caret' />
            <input
              style={bgColor}
              className={themeClassName}
              autoFocus={true}
              onInput={this.setInputCaretPosition}
              onKeyDown={this.setInputCaretPosition}
              onKeyUp={this.eventHandlers.onKeyUp(id)}
              onChange={this.setInputCaretPosition}
              onClick={this.setInputCaretPosition}
              onPaste={this.setInputCaretPosition}
              onCut={this.setInputCaretPosition}
              onCopy={this.setInputCaretPosition}
              onMouseDown={this.setInputCaretPosition}
              onMouseUp={this.setInputCaretPosition}
              onFocus={() => this.animateCaret(true)}
              onBlur={() => this.animateCaret(false)}
              ref={this.input}
            />
          </div>
          <div className={actionButtonContainer}>
            <button
              className={`rte-thumbsup-button ${themeClassName}`}
              onClick={this.eventHandlers.onThumbsUp()}
            >
              👍
            </button>
            <button
              className={`rte-send-button ${themeClassName}`}
              onClick={this.eventHandlers.onReply(id)}
              disabled={!canSendMessage}
              title={i18n.t('Send')()}
            />
          </div>
        </div>
      </div>
    );
  }

  /**
   * Renders external badge if the content is from external
   * @param isExternal
   */
  private renderExtBadge(isExternal: boolean): JSX.Element | undefined {
    if (!isExternal) {
      return;
    }
    return (
      <div className='ext-badge-container'>
        <img
          src='../renderer/assets/notification-ext-badge.svg'
          alt='ext-badge'
        />
      </div>
    );
  }

  /**
   * Invoked when the notification window is clicked
   *
   * @param id {number}
   */
  private click(id: number): void {
    ipcRenderer.send('notification-clicked', id);
    this.clearFlashInterval();
  }

  /**
   * Closes the notification
   *
   * @param id {number}
   */
  private close(id: number): void {
    ipcRenderer.send('close-notification', id);
    this.clearFlashInterval();
  }

  /**
   * Disable context menu
   *
   * @param event
   */
  private contextMenu(event): void {
    event.preventDefault();
  }

  /**
   * Handle mouse enter
   *
   * @param id {number}
   */
  private onMouseEnter(id: number): void {
    ipcRenderer.send('notification-mouseenter', id);
  }

  /**
   * Handle mouse over
   *
   * @param id {number}
   */
  private onMouseLeave(id: number): void {
    const { isInputHidden } = this.state;
    ipcRenderer.send('notification-mouseleave', id, isInputHidden);
  }

  /**
   * Insets a thumbs up emoji
   * @private
   */
  private onThumbsUp(): void {
    if (this.input.current) {
      const input = this.input.current.value;
      this.input.current.value = input + '👍';
      this.setInputCaretPosition();
      this.input.current.focus();
    }
  }

  /**
   * Handles reply action
   * @param id
   * @private
   */
  private onReply(id: number): void {
    let replyText = this.getInputValue();
    if (replyText) {
      // need to replace 👍 with :thumbsup: to make sure client displays the correct emoji
      replyText = replyText.replace(/👍/g, ':thumbsup: ');
      ipcRenderer.send('notification-on-reply', id, replyText);
    }
  }

  /**
   * Clears a active notification flash interval
   */
  private clearFlashInterval(): void {
    if (this.flashTimer) {
      clearInterval(this.flashTimer);
    }
  }

  /**
   * Displays an input on the notification
   *
   * @private
   */
  private onOpenReply(event, id) {
    event.stopPropagation();
    ipcRenderer.send('show-reply', id);
    this.setState(
      {
        isInputHidden: false,
        hasReply: false,
        containerHeight: CONTAINER_HEIGHT_WITH_INPUT,
      },
      () => {
        this.input.current?.focus();
      },
    );
  }

  /**
   * Trim and returns the input value
   * @private
   */
  private getInputValue(): string | undefined {
    return this.input.current?.value.trim();
  }

  /**
   * Handles key up event and enter keyCode
   *
   * @param event
   * @param id
   * @private
   */
  private onKeyUp(event, id) {
    this.setInputCaretPosition();
    if (event.key === 'Enter' || event.keyCode === 13) {
      this.onReply(id);
    }
  }

  /**
   * Moves the custom input caret based on input text
   * @private
   */
  private setInputCaretPosition() {
    if (this.customInput.current) {
      if (this.input.current) {
        const inputText = this.input.current.value || '';
        const selectionStart = this.input.current.selectionStart || 0;
        this.customInput.current.innerText = inputText
          .substring(0, selectionStart)
          .replace(/\n$/, '\n\u0001');
        this.setState({
          canSendMessage: inputText.trim().length > 0,
        });
      }

      const rects = this.customInput.current.getClientRects();
      const lastRect = rects && rects[rects.length - 1];

      const x = (lastRect && lastRect.width) || 0;
      if (this.inputCaret.current) {
        this.inputCaret.current.style.left = x + 'px';
      }
    }
  }

  /**
   * Adds blinking animation to input caret
   * @param hasFocus
   * @private
   */
  private animateCaret(hasFocus: boolean) {
    if (hasFocus) {
      this.inputCaret.current?.classList.add('input-caret-focus');
    } else {
      this.inputCaret.current?.classList.remove('input-caret-focus');
    }
  }

  /**
   * Sets the component state
   *
   * @param _event
   * @param data {Object}
   */
  private updateState(_event, data): void {
    const { color, flash } = data;
    data.color = color && !color.startsWith('#') ? '#' + color : color;
    data.isInputHidden = true;
    data.containerHeight = CONTAINER_HEIGHT;

    data.color = this.isValidColor(data.color) ? data.color : '';

    this.resetNotificationData();
    this.setState(data as IState);

    if (this.flashTimer) {
      clearInterval(this.flashTimer);
    }
    if (flash) {
      const origColor = data.color;
      this.flashTimer = setInterval(() => {
        const { color: bgColor } = this.state;
        if (bgColor === 'red') {
          this.setState({ color: origColor });
        } else {
          this.setState({ color: 'red' });
        }
      }, 1000);
    }
  }

  /**
   * Validates the color
   * @param color
   * @private
   */
  private isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6})/.test(color);
  }

  /**
   * Reset data for new notification
   * @private
   */
  private resetNotificationData(): void {
    if (this.input.current) {
      this.input.current.value = '';
    }
    this.setInputCaretPosition();
  }
}
