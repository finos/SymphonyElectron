import { get } from 'https';
import * as nodeURL from 'url';
import { buildNumber, clientVersion, version } from '../../package.json';
import { logger } from '../common/logger';
import { config, IConfig } from './config-handler';
import { eventEmitter } from './event-emitter';

interface IVersionInfo {
    sdaVersion: string;
    clientVersion: string;
    buildNumber: string;
}

class VersionHandler {

    private versionInfo: IVersionInfo;

    constructor() {
        this.versionInfo = {
            sdaVersion: version,
            clientVersion,
            buildNumber,
        };
        this.getClientVersion();

    }

    /**
     * Get version Info for the app
     */
    public getVersionInfo(): IVersionInfo {
        return this.versionInfo;
    }

    /**
     * Get Symphony version from the pod
     */
    private getClientVersion() {

        const { url: podUrl }: IConfig = config.getGlobalConfigFields(['url']);

        if (!podUrl) {
            return;
        }

        const hostname = nodeURL.parse(podUrl).hostname;
        const protocol = nodeURL.parse(podUrl).protocol;
        const versionApiPath = '/webcontroller/HealthCheck/version/advanced';

        const url = `${protocol}//${hostname}${versionApiPath}`;
        logger.info(`Trying to get version info for the URL: ${url}`);

        get(url, (res) => {

            let body: string = '';
            res.on('data', (d: Buffer) => {
                body += d;
            });

            res.on('end', () => {
                try {
                    const data = JSON.parse(body)[0];
                    this.versionInfo = {
                        sdaVersion: version,
                        clientVersion: data['Implementation-Version'] || this.versionInfo.clientVersion ,
                        buildNumber: data['Implementation-Build'] || this.versionInfo.buildNumber,
                    };
                    logger.info(`Updated version info from server! ${JSON.stringify(this.versionInfo)}`);
                    eventEmitter.emit('update-version-info', this.versionInfo);
                } catch (error) {
                    logger.error(`version-handler: Error parsing version data! ${error}`);
                }
            });

        }).on('error', (err) => {
            logger.error(`version-handler: Error getting version data! ${err}`);
        });
    }

}

const versionHandler = new VersionHandler();

export { versionHandler, IVersionInfo };
