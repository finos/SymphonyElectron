import { BrowserWindow, dialog, shell } from 'electron';
import * as fs from 'fs';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { windowExists } from './window-utils';

const DOWNLOAD_MANAGER_NAMESPACE = 'DownloadManager';

export interface IDownloadItem {
    _id: string;
    fileName: string;
    savedPath: string;
    total: string;
}

class DownloadHandler {
    /**
     * Show dialog for failed cases
     */
    private static async showDialog(): Promise<void> {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const message = i18n.t('The file you are trying to open cannot be found in the specified path.', DOWNLOAD_MANAGER_NAMESPACE)();
        const title = i18n.t('File not Found', DOWNLOAD_MANAGER_NAMESPACE)();

        if (!focusedWindow || !windowExists(focusedWindow)) {
            return;
        }
        await dialog.showMessageBox(focusedWindow, {
            message,
            title,
            type: 'error',
        });
    }

    private window!: Electron.WebContents | null;
    private items: IDownloadItem[] = [];

    /**
     * Sets the window for the download handler
     * @param window Window object
     */
    public setWindow(window: Electron.WebContents): void {
        this.window = window;
        logger.info(`download-handler: Initialized download handler`);
    }

    /**
     * Opens the downloaded file
     *
     * @param id {string} File ID
     */
    public async openFile(id: string): Promise<void> {
        const filePath = this.getFilePath(id);

        const openResponse = fs.existsSync(`${filePath}`);
        if (openResponse) {
            const result = await shell.openPath(`${filePath}`);
            if (result === '') {
                return;
            }
        }

        await DownloadHandler.showDialog();
    }

    /**
     * Opens the downloaded file in finder/explorer
     *
     * @param id {string} File ID
     */
    public showInFinder(id: string): void {
        const filePath = this.getFilePath(id);

        if (fs.existsSync(filePath)) {
            shell.showItemInFolder(filePath);
            return;
        }

        DownloadHandler.showDialog();
    }

    /**
     * Clears download items
     */
    public clearDownloadedItems(): void {
        this.items = [];
    }

    /**
     * Handle a successful download
     * @param item Download item
     */
    public onDownloadSuccess(item: IDownloadItem): void {
        this.items.push(item);
        this.sendDownloadCompleted(item);
    }

    /**
     * Handle a failed download
     */
    public onDownloadFailed(): void {
        this.sendDownloadFailed();
    }

    /**
     * Send download completed event to the renderer process
     */
    private sendDownloadCompleted(item: IDownloadItem): void {
        if (this.window && !this.window.isDestroyed()) {
            logger.info(`download-handler: Download completed! Informing the client!`);
            this.window.send('download-completed', {
                id: item._id, fileDisplayName: item.fileName, fileSize: item.total,
            });
        }
    }

    /**
     * Send download failed event to the renderer process
     */
    private sendDownloadFailed(): void {
        if (this.window && !this.window.isDestroyed()) {
            logger.info(`download-handler: Download failed! Informing the client!`);
            this.window.send('download-failed');
        }
    }

    /**
     * Get file path for the given item
     * @param id ID of the item
     */
    private getFilePath(id: string): string {
        const fileIndex = this.items.findIndex((item) => {
            return item._id === id;
        });

        return this.items[fileIndex].savedPath;
    }

}

const downloadHandler = new DownloadHandler();
export { downloadHandler };
