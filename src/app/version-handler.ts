import { get } from 'https';
import * as nodeURL from 'url';
import { buildNumber, clientVersion, optionalDependencies, searchAPIVersion, version } from '../../package.json';
import { logger } from '../common/logger';
import { config, IConfig } from './config-handler';
import { eventEmitter } from './event-emitter';

interface IVersionInfo {
    clientVersion: string;
    buildNumber: string;
    sdaVersion: string;
    sdaBuildNumber: string;
    electronVersion: string;
    chromeVersion: string;
    v8Version: string;
    nodeVersion: string;
    openSslVersion: string;
    zlibVersion: string;
    uvVersion: string;
    aresVersion: string;
    httpParserVersion: string;
    swiftSearchVersion: string;
    swiftSerchSupportedVersion: string;
}

class VersionHandler {

    private versionInfo: IVersionInfo;
    private serverVersionInfo: any;

    constructor() {
        this.versionInfo = {
            clientVersion,
            buildNumber,
            sdaVersion: version,
            sdaBuildNumber: buildNumber,
            electronVersion: process.versions.electron,
            chromeVersion: process.versions.chrome,
            v8Version: process.versions.v8,
            nodeVersion: process.versions.node,
            openSslVersion: process.versions.openssl,
            zlibVersion: process.versions.zlib,
            uvVersion: process.versions.uv,
            aresVersion: process.versions.ares,
            httpParserVersion: process.versions.http_parser,
            swiftSearchVersion: optionalDependencies['swift-search'],
            swiftSerchSupportedVersion: searchAPIVersion,
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

        if (this.serverVersionInfo) {
            this.versionInfo.clientVersion = this.serverVersionInfo['Implementation-Version'] || this.versionInfo.clientVersion;
            this.versionInfo.buildNumber = this.serverVersionInfo['Implementation-Build'] || this.versionInfo.buildNumber;
            return;
        }

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
                    this.serverVersionInfo = JSON.parse(body)[0];
                    this.versionInfo.clientVersion = this.serverVersionInfo['Implementation-Version'] || this.versionInfo.clientVersion;
                    this.versionInfo.buildNumber = this.serverVersionInfo['Implementation-Build'] || this.versionInfo.buildNumber;
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
