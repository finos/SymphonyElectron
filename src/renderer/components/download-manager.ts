import { ipcRenderer } from 'electron';

import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';

const DOWNLOAD_MANAGER_NAMESPACE = 'DownloadManager';
interface IDownloadManager {
    _id: string;
    fileName: string;
    savedPath: string;
    total: number;
    flashing: boolean;
    count: number;
}

interface IManagerState {
    items: IDownloadManager[];
    showMainComponent: boolean;
}

export default class DownloadManager {

    private readonly eventHandlers = {
        onInjectItem: (_event, item: IDownloadManager) => this.injectItem(item),
    };
    private readonly itemsContainer: HTMLElement | null;
    private readonly closeButton: HTMLElement | null;

    private domParser: DOMParser;
    private state: IManagerState;

    constructor() {
        this.state = {
            items: [],
            showMainComponent: false,
        };
        this.domParser = new DOMParser();
        const parsedDownloadBar = this.domParser.parseFromString(this.render(), 'text/html');
        this.itemsContainer = parsedDownloadBar.getElementById('download-main');
        this.closeButton = parsedDownloadBar.getElementById('close-download-bar');

        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }

        this.getFileDisplayName = this.getFileDisplayName.bind(this);
    }

    /**
     * initializes the event listeners
     */
    public initDownloadManager(): void {
        ipcRenderer.on('downloadCompleted', this.eventHandlers.onInjectItem);
    }

    /**
     * Main react render component
     */
    public render(): string {
        return (`
            <div id='download-manager' class='download-bar'>
                <ul id='download-main' />
                <span
                    id='close-download-bar'
                    class='close-download-bar tempo-icon tempo-icon--close' />
            </div>
        `);
    }

    /**
     * Toggles footer visibility class based on download items
     */
    private showOrHideDownloadBar(): void {
        const mainFooter = document.getElementById('footer');
        const { items } = this.state;
        if (mainFooter) {
            items && items.length ? mainFooter.classList.remove('hidden') : mainFooter.classList.add('hidden');
        }
    }

    /**
     * Loop through the items downloaded
     *
     * @param item {IDownloadManager}
     */
    private renderItem(item: IDownloadManager): void {
        const { _id, total, fileName }: IDownloadManager = item;
        const fileDisplayName = this.getFileDisplayName(fileName, item);
        const itemContainer = document.getElementById('download-main');
        const parsedItem = this.domParser.parseFromString(`
            <li id=${_id} class='download-element' title="${fileDisplayName}">
                <div class='download-item' id='dl-item'>
                    <div class='file'>
                        <div id='download-progress' class='download-complete flash'>
                            <span class='tempo-icon tempo-icon--download download-complete-color'/>
                        </div>
                    </div>
                    <div class='downloaded-filename'>
                        <h1 class='text-cutoff'>
                            ${fileDisplayName}
                        </h1>
                        <span id='per' title="${total} ${i18n.t('downloaded', DOWNLOAD_MANAGER_NAMESPACE)()}">
                            ${total} ${i18n.t('downloaded', DOWNLOAD_MANAGER_NAMESPACE)()}
                        </span>
                    </div>
                </div>
                <div id='menu' class='caret tempo-icon tempo-icon--dropdown'>
                    <div id='download-action-menu' class='download-action-menu' style={width: '200px'}>
                        <ul id={_id}>
                            <li id='download-open' title="${i18n.t('Open', DOWNLOAD_MANAGER_NAMESPACE)()}">
                                ${i18n.t('Open', DOWNLOAD_MANAGER_NAMESPACE)()}
                            </li>
                            <li id='download-show-in-folder' title="${i18n.t('Show in Folder', DOWNLOAD_MANAGER_NAMESPACE)()}">
                                ${i18n.t('Show in Folder', DOWNLOAD_MANAGER_NAMESPACE)()}
                            </li>
                        </ul>
                    </div>
                </div>
            </li>`,
            'text/html');
        const progress = parsedItem.getElementById('download-progress');
        const domItem = parsedItem.getElementById(_id);

        // add event listeners
        this.attachEventListener('dl-item', parsedItem, _id);
        this.attachEventListener('download-open', parsedItem, _id);
        this.attachEventListener('download-show-in-folder', parsedItem, _id);

        if (itemContainer && domItem) {
            itemContainer.prepend(domItem);
        }
        setTimeout(() => {
            if (progress) {
                progress.classList.remove('flash');
            }
        }, 4000);
    }

    /**
     * Inject items to global var
     *
     * @param args {IDownloadManager}
     */
    private injectItem(args: IDownloadManager): void {
        const { items } = this.state;
        let itemCount = 0;
        for (const item of items) {
            if (args.fileName === item.fileName) {
                itemCount++;
            }
        }
        args.count = itemCount;
        const newItem = { ...args, ...{ flashing: true } };
        const allItems = [ ...items, ...[ newItem ] ];
        this.state = { items: allItems, showMainComponent: true };

        // inserts download bar once
        const downloadBar = document.getElementById('download-manager-footer');
        if (this.itemsContainer && this.closeButton) {
            this.showOrHideDownloadBar();
            if (downloadBar) {
                downloadBar.appendChild(this.itemsContainer);
                downloadBar.appendChild(this.closeButton);
            }
        }

        // appends items to the download bar
        this.renderItem(newItem);
    }

    /**
     * adds event listener for the give id
     *
     * @param id {String}
     * @param item {Document}
     * @param itemId {String}
     */
    private attachEventListener(id: string, item: Document, itemId: string): void {
        if (!item) {
            return;
        }

        const element = item.getElementById(id);
        if (element) {
            switch (id) {
                case 'dl-item':
                case 'download-open':
                    element.addEventListener('click', () => this.openFile(itemId));
                    break;
                case 'download-show-in-folder':
                    element.addEventListener('click', () => this.showInFinder(itemId));
            }
        }
    }

    /**
     * Show or hide main footer which comes from the client
     */
    private close(): void {
        this.state = {
            showMainComponent: !this.state.showMainComponent,
            items: [],
        };
        if (this.itemsContainer) {
            this.itemsContainer.innerHTML = '';
        }
        this.showOrHideDownloadBar();
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
     * @param fileName {String}
     * @param item {IDownloadManager}
     */
    private getFileDisplayName(fileName: string, item: IDownloadManager): string {
        /* If it exists, add a count to the name like how Chrome does */
        if (item.count > 0) {
            const extLastIndex = fileName.lastIndexOf('.');
            const fileCount = ' (' + item.count + ')';

            fileName = fileName.slice(0, extLastIndex) + fileCount + fileName.slice(extLastIndex);
        }
        return fileName;
    }
}
