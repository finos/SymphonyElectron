import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';

import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';

const DOWNLOAD_MANAGER_NAMESPACE = 'DownloadManager';
interface IDownloadManager {
    _id: string;
    fileName: string;
    savedPath: string;
    total: number;
    flashing: boolean;
}

interface IManagerState {
    items: IDownloadManager[];
    showMainComponent: boolean;
}

type mouseEventLi = React.MouseEvent<HTMLLIElement>;
type mouseEventDiv = React.MouseEvent<HTMLDivElement>;

export default class DownloadManager extends React.Component<{}, IManagerState> {

    private readonly eventHandlers = {
        onClose: () => this.close(),
        onInjectItem: (_event, item: IDownloadManager) => this.injectItem(item),
        onOpenFile: (id: string) => (_event: mouseEventLi | mouseEventDiv) => this.openFile(id),
        onShowInFinder: (id: string) => (_event: mouseEventLi) => this.showInFinder(id),
    };

    constructor(props) {
        super(props);

        this.state = {
            items: [],
            showMainComponent: false,
        };
        this.getFileDisplayName = this.getFileDisplayName.bind(this);
    }

    public componentDidMount(): void {
        ipcRenderer.on('downloadCompleted', this.eventHandlers.onInjectItem);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('downloadCompleted', this.eventHandlers.onInjectItem);
    }

    /**
     * Main react render component
     */
    public render(): React.ReactNode {
        const mainFooter = document.getElementById('footer');
        const { items } = this.state;
        if (mainFooter) {
            items && items.length ? mainFooter.classList.remove('hidden') : mainFooter.classList.add('hidden');
        }
        return (
            <div>
                <div id='download-manager-footer' className='download-bar'>
                    <ul id='download-main'>
                        {this.renderItems()}
                    </ul>
                    <span
                        id='close-download-bar'
                        className='close-download-bar tempo-icon tempo-icon--close'
                        onClick={this.eventHandlers.onClose}/>
                </div>
            </div>
        );
    }

    /**
     * Loop through the items downloaded
     * @param item
     */
    private mapItems(item: IDownloadManager): JSX.Element | undefined {
        if (!item) {
            return;
        }
        const { _id, total, fileName, flashing }: IDownloadManager = item;
        setTimeout(() => {
            const { items } = this.state;
            const index = items.findIndex((i) => i._id === _id);
            if (index !== -1) {
                items[index].flashing = false;
                this.setState({
                    items,
                });
            }
        }, 4000);
        const fileDisplayName = this.getFileDisplayName(fileName);
        return (
            <li key={_id} id={_id} className='download-element'>
                <div className='download-item' id='dl-item' onClick={this.eventHandlers.onOpenFile(_id)}>
                    <div className='file'>
                        <div id='download-progress' className={classNames('download-complete', { flash: flashing })}>
                            <span className='tempo-icon tempo-icon--download download-complete-color'/>
                        </div>
                    </div>
                    <div className='downloaded-filename'>
                        <h1 className='text-cutoff' title={fileDisplayName}>
                            {fileDisplayName}
                        </h1>
                        <span id='per'>
                            {total}{i18n.t('Downloaded', DOWNLOAD_MANAGER_NAMESPACE)()}
                        </span>
                    </div>
                </div>
                <div id='menu' className='caret tempo-icon tempo-icon--dropdown'>
                    <div id='download-action-menu' className='download-action-menu'>
                        <ul id={_id}>
                            <li id='download-open' onClick={this.eventHandlers.onOpenFile(_id)}>
                                {i18n.t('Open', DOWNLOAD_MANAGER_NAMESPACE)()}
                            </li>
                            <li id='download-show-in-folder' onClick={this.eventHandlers.onShowInFinder(_id)}>
                                {i18n.t('Show in Folder', DOWNLOAD_MANAGER_NAMESPACE)()}
                            </li>
                        </ul>
                    </div>
                </div>
            </li>
        );
    }

    /**
     * Inject items to global var
     * @param args
     */
    private injectItem(args: IDownloadManager): void {
        const { items } = this.state;
        const allItems = [ ...items, ...[ { ...args, ...{ flashing: true } } ] ];
        this.setState({ items: allItems, showMainComponent: true });
    }

    /**
     * Show or hide main footer which comes from the client
     */
    private close(): void {
        this.setState({
            showMainComponent: !this.state.showMainComponent,
            items: [],
        });
    }

    /**
     * Opens the downloaded file
     *
     * @param id {string}
     */
    private openFile(id: string): void {
        const { items } = this.state;
        const fileIndex = items.findIndex((item) => {
            return item._id === id;
        });

        if (fileIndex !== -1) {
            ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.downloadManagerAction,
                path: items[ fileIndex ].savedPath,
                type: 'open',
            });
        }
    }

    /**
     * Opens the downloaded file in finder/explorer
     *
     * @param id {string}
     */
    private showInFinder(id: string): void {
        const { items } = this.state;
        const fileIndex = items.findIndex((item) => {
            return item._id === id;
        });

        if (fileIndex !== -1) {
            ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.downloadManagerAction,
                path: items[ fileIndex ].savedPath,
                type: 'show',
            });
        }
    }

    /**
     * Checks and constructs file name
     *
     * @param fileName
     */
    private getFileDisplayName(fileName: string): string {
        const { items } = this.state;
        let fileNameCount = 0;
        let fileDisplayName = fileName;

        /* Check if a file with the same name exists
         * (akin to the user downloading a file with the same name again)
         * in the download bar
         */
        for (const value of items) {
            if (fileName === value.fileName) {
                fileNameCount++;
            }
        }

        /* If it exists, add a count to the name like how Chrome does */
        if (fileNameCount) {
            const extLastIndex = fileDisplayName.lastIndexOf('.');
            const fileCount = ' (' + fileNameCount + ')';

            fileDisplayName = fileDisplayName.slice(0, extLastIndex) + fileCount + fileDisplayName.slice(extLastIndex);
        }

        return fileDisplayName;
    }

    /**
     * Map of items
     */
    private renderItems(): Array<JSX.Element | undefined> {
        return this.state.items.map((items) => this.mapItems(items)).reverse();
    }
}
