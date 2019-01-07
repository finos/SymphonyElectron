import classNames from 'classnames';
import { DesktopCapturerSource, ipcRenderer } from 'electron';
import * as React from 'react';

import { apiCmds, apiName } from '../../common/api-interface';
import { isWindowsOS } from '../../common/env';
import { i18n } from '../../common/i18n-preload';

const screenRegExp = new RegExp(/^Screen \d+$/gmi);
const SCREEN_PICKER_NAMESPACE = 'ScreenPicker';

interface IState {
    sources: Electron.DesktopCapturerSource[];
    selectedSource: DesktopCapturerSource | undefined;
    selectedTab: tabs;
}

type tabs = 'screens' | 'applications';

const enum keyCode {
    pageDown = 34,
    rightArrow = 39,
    pageUp = 33,
    leftArrow = 37,
    homeKey = 36,
    upArrow = 38,
    endKey = 35,
    arrowDown = 40,
    enterKey = 13,
    escapeKey = 27,
}

export default class ScreenPicker extends React.Component<{}, IState> {

    private isScreensAvailable: boolean;
    private isApplicationsAvailable: boolean;
    private readonly eventHandlers = {
        onSelect: (src) => this.select(src),
        onToggle: (tab) => this.toggle(tab),
        onClose: () => this.close(),
        onSubmit: () => this.submit(),
    };
    private currentIndex: number;

    constructor(props) {
        super(props);
        this.state = {
            sources: [],
            selectedSource: undefined,
            selectedTab: 'screens',
        };
        this.currentIndex = 0;
        this.isScreensAvailable = false;
        this.isApplicationsAvailable = false;
        this.updateState = this.updateState.bind(this);
        this.handleKeyUpPress = this.handleKeyUpPress.bind(this);
        this.renderTabTitles = this.renderTabTitles.bind(this);
    }

    public componentDidMount(): void {
        ipcRenderer.on('screen-picker-data', this.updateState);
        document.addEventListener('keyup', this.handleKeyUpPress, true);
        if (isWindowsOS) document.body.classList.add('ScreenPicker-window-border');
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('screen-picker-data', this.updateState);
        document.removeEventListener('keyup', this.handleKeyUpPress, true);
    }

    /**
     * main render function
     */
    public render(): JSX.Element {
        const { sources, selectedSource } = this.state;
        return (
            <div className='ScreenPicker ScreenPicker-content'>
                <div className='ScreenPicker-title'>
                    <span>{i18n.t(`Choose what you'd like to share`, SCREEN_PICKER_NAMESPACE)()}</span>
                    <div className='ScreenPicker-x-button' onClick={this.eventHandlers.onClose}>
                        <div className='content-button'>
                            <i>
                                <svg viewBox='0 0 48 48' fill='grey'>
                                    <path
                                        d='M39.4,33.8L31,25.4c-0.4-0.4-0.9-0.9-1.4-1.4c0.5-0.5,1-1,1.4-1.4l8.4-8.4c0.8-0.8,0.8-2,0-2.8l-2.8-2.8 c-0.8-0.8-2-0.8-2.8,0L25.4,17c-0.4,0.4-0.9,0.9-1.4,1.4c-0.5-0.5-1-1-1.4-1.4l-8.4-8.4c-0.8-0.8-2-0.8-2.8,0l-2.8,2.8 c-0.8,0.8-0.8,2,0,2.8l8.4,8.4c0.4,0.4,0.9,0.9,1.4,1.4c-0.5,0.5-1,1-1.4,1.4l-8.4,8.4c-0.8,0.8-0.8,2,0,2.8l2.8,2.8 c0.8,0.8,2,0.8,2.8,0l8.4-8.4c0.4-0.4,0.9-0.9,1.4-1.4c0.5,0.5,1,1,1.4,1.4l8.4,8.4c0.8,0.8,2,0.8,2.8,0l2.8-2.8 C40.2,35.8,40.2,34.6,39.4,33.8z'
                                    />
                                </svg>
                            </i>
                        </div>
                    </div>
                </div>
                {this.renderSources(sources)}
                <footer>
                    <button
                        className='ScreenPicker-cancel-button'
                        onClick={this.eventHandlers.onClose}
                    >
                        {i18n.t('Cancel', SCREEN_PICKER_NAMESPACE)()}
                    </button>
                    <button
                        className={classNames('ScreenPicker-share-button',
                            { 'ScreenPicker-share-button-disable': !selectedSource })}
                        onClick={this.eventHandlers.onSubmit}
                    >
                        {selectedSource ? i18n.t('Share', SCREEN_PICKER_NAMESPACE)() : i18n.t('Select Screen', SCREEN_PICKER_NAMESPACE)()}
                    </button>
                </footer>
            </div>
        );
    }

    /**
     * Renders the sources by separating screens and applications
     *
     * @param sources {DesktopCapturerSource}
     */
    private renderSources(sources: Electron.DesktopCapturerSource[]): JSX.Element {
        const screens: JSX.Element[] = [];
        const applications: JSX.Element[] = [];
        sources.map((source: Electron.DesktopCapturerSource) => {
            screenRegExp.lastIndex = 0;
            const shouldHighlight: string = classNames(
                'ScreenPicker-item-container',
                { 'ScreenPicker-selected': this.shouldHighlight(source.id) },
            );
            if (source.name === 'Entire screen' || screenRegExp.exec(source.name)) {
                screens.push(
                    <div
                        className={shouldHighlight}
                        id={source.id}
                        onClick={() => this.eventHandlers.onSelect(source)}>
                        <div className='ScreenPicker-screen-section-box'>
                            <img className='ScreenPicker-img-wrapper' src={source.thumbnail as any} alt='thumbnail image'/>
                        </div>
                        <div className='ScreenPicker-screen-source-title'>{source.name}</div>
                    </div>,
                );
            } else {
                applications.push(
                    <div
                        className={shouldHighlight}
                        id={source.id}
                        onClick={() => this.eventHandlers.onSelect(source)}>
                        <div className='ScreenPicker-screen-section-box'>
                            <img className='ScreenPicker-img-wrapper' src={source.thumbnail as any} alt='thumbnail image'/>
                        </div>
                        <div className='ScreenPicker-screen-source-title'>{source.name}</div>
                    </div>,
                );
            }
        });
        this.isScreensAvailable = screens.length > 0;
        this.isApplicationsAvailable = applications.length > 0;
        if (!this.isScreensAvailable && !this.isApplicationsAvailable) {
            return (
                <div className='ScreenPicker-error-content'>
                <span className='error-message'>
                    {i18n.t('No screens or applications are currently available.', SCREEN_PICKER_NAMESPACE)()}
                    </span>
                </div>
            );
        }

        return (
            <div className='ScreenPicker-main-content'>
                {this.renderTabTitles()}
                <section id='screen-contents'>{screens}</section>
                <section id='application-contents'> {applications}</section>
            </div>
        );
    }

    /**
     * Renders the screen and application tab section
     */
    private renderTabTitles(): JSX.Element[] | undefined {
        const { selectedTab } = this.state;
        if (this.isScreensAvailable && this.isApplicationsAvailable) {
            return [
                <input
                    id='screen-tab'
                    className='ScreenPicker-screen-tab'
                    type='radio'
                    name='tabs'
                    checked={selectedTab === 'screens'}
                    onChange={() => this.eventHandlers.onToggle('screens')}
                />,
                <label className={classNames('screens', { hidden: !this.isScreensAvailable })}
                       htmlFor='screen-tab'
                >
                    {i18n.t('Screens', SCREEN_PICKER_NAMESPACE)()}
                </label>,
                <input
                    id='application-tab'
                    className='ScreenPicker-application-tab'
                    type='radio'
                    name='tabs'
                    checked={selectedTab === 'applications'}
                    onChange={() => this.eventHandlers.onToggle('applications')}
                />,
                <label className={classNames('applications', { hidden: !this.isApplicationsAvailable })}
                       htmlFor='application-tab'
                >
                    {i18n.t('Applications', SCREEN_PICKER_NAMESPACE)()}
                </label>,
            ];
        }
        if (this.isScreensAvailable) {
            return [
                <input
                    id='screen-tab'
                    className='ScreenPicker-screen-tab'
                    type='radio'
                    name='tabs'
                    checked={true}
                    onChange={() => this.eventHandlers.onToggle('screens')}
                />,
                <label className={classNames('screens', { hidden: !this.isScreensAvailable })}
                       htmlFor='screen-tab'
                >
                    {i18n.t('Screens', SCREEN_PICKER_NAMESPACE)()}
                </label>,
            ];
        }
        if (this.isApplicationsAvailable) {
            return [
                <input
                    id='application-tab'
                    className='ScreenPicker-application-tab'
                    type='radio'
                    name='tabs'
                    checked={true}
                    onChange={() => this.eventHandlers.onToggle('applications')}
                />,
                <label className={classNames('applications', { hidden: !this.isApplicationsAvailable })}
                       htmlFor='application-tab'
                >
                    {i18n.t('Applications', SCREEN_PICKER_NAMESPACE)()}
                </label>,
            ];
        }
        return;
    }

    /**
     * Updates the selected state
     *
     * @param id {string}
     */
    private shouldHighlight(id: string): boolean {
        const { selectedSource } = this.state;
        return selectedSource ? id === selectedSource.id : false;
    }

    /**
     * updates the state when the source is selected
     *
     * @param selectedSource {DesktopCapturerSource}
     */
    private select(selectedSource: DesktopCapturerSource): void {
        this.setState({ selectedSource });
    }

    /**
     * Updates the screen picker tabs
     *
     * @param selectedTab
     */
    private toggle(selectedTab: tabs): void {
        this.setState({ selectedTab });
    }

    /**
     * Closes the screen picker window
     */
    private close(): void {
        ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.closeWindow,
            windowType: 'screen-picker',
        });
    }

    /**
     * Sends the selected source to the main process
     * and closes the screen picker window
     */
    private submit(): void {
        const { selectedSource } = this.state;
        if (selectedSource) {
            ipcRenderer.send('screen-source-selected', selectedSource);
            this.eventHandlers.onClose();
        }
    }

    /**
     * Method handles used key up event
     * @param e
     */
    private handleKeyUpPress(e): void {
        const key = e.keyCode || e.which;
        const { sources } = this.state;

        switch (key) {
            case keyCode.pageDown:
            case keyCode.rightArrow:
                this.updateSelectedSource(1);
                break;
            case keyCode.pageUp:
            case keyCode.leftArrow:
                this.updateSelectedSource(-1);
                break;
            case keyCode.homeKey:
                if (this.currentIndex !== 0) {
                    this.updateSelectedSource(0);
                }
                break;
            case keyCode.upArrow:
                this.updateSelectedSource(-2);
                break;
            case keyCode.endKey:
                if (this.currentIndex !== sources.length - 1) {
                    this.updateSelectedSource(sources.length - 1);
                }
                break;
            case keyCode.arrowDown:
                this.updateSelectedSource(2);
                break;
            case keyCode.enterKey:
                this.eventHandlers.onSubmit();
                break;
            case keyCode.escapeKey:
                this.eventHandlers.onClose();
                break;
            default:
                break;
        }
    }

    /**
     * Updated the UI selected state based on
     * the selected source state
     *
     * @param index
     */
    private updateSelectedSource(index) {
        const { sources, selectedSource } = this.state;
        if (selectedSource) {
            this.currentIndex = sources.findIndex((source) => {
                return source.id === selectedSource.id;
            });
        }

        // Find the next item to be selected
        const nextIndex = (this.currentIndex + index + sources.length) % sources.length;
        if (sources[ nextIndex ] && sources[ nextIndex ].id) {
            // Updates the selected source
            this.setState({ selectedSource: sources[ nextIndex ] });
        }
    }

    /**
     * Sets the About app state
     *
     * @param _event
     * @param data {Object}
     */
    private updateState(_event, data): void {
        this.setState(data as IState);
    }
}