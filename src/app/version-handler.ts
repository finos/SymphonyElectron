import { net } from 'electron';
import * as nodeURL from 'url';
import { buildNumber, clientVersion, optionalDependencies, searchAPIVersion, sfeVersion, version } from '../../package.json';
import { logger } from '../common/logger';
import { config, IGlobalConfig } from './config-handler';

interface IVersionInfo {
    clientVersion: string;
    buildNumber: string;
    sfeVersion: string;
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
    swiftSearchSupportedVersion: string;
}

class VersionHandler {

    public versionInfo: IVersionInfo;
    private serverVersionInfo: any;
    private mainUrl;
    private sfeVersionInfo: any;

    constructor() {
        this.versionInfo = {
            clientVersion,
            buildNumber,
            sfeVersion,
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
            swiftSearchSupportedVersion: searchAPIVersion,
        };
        this.mainUrl = null;
    }

    /**
     * Get Symphony version from the pod
     */
    public getClientVersion(fetchFromServer: boolean = false, mainUrl?: string): Promise<IVersionInfo> {
        return new Promise((resolve) => {

            if (this.serverVersionInfo && !fetchFromServer) {
                this.versionInfo.clientVersion = this.serverVersionInfo['Implementation-Version'] || this.versionInfo.clientVersion;
                this.versionInfo.buildNumber = this.serverVersionInfo['Implementation-Build'] || this.versionInfo.buildNumber;
                resolve(this.versionInfo);
                return;
            }

            if (mainUrl) {
                this.mainUrl = mainUrl;
            }

            const { url: podUrl }: IGlobalConfig = config.getGlobalConfigFields(['url']);

            if (!this.mainUrl || !nodeURL.parse(this.mainUrl)) {
                this.mainUrl = podUrl;
            }

            if (!this.mainUrl) {
                logger.error(`version-handler: Unable to get pod url for getting version data from server! Setting defaults!`);
                resolve(this.versionInfo);
                return;
            }

            const hostname = nodeURL.parse(this.mainUrl).hostname;
            const protocol = nodeURL.parse(this.mainUrl).protocol;

            if (protocol && protocol.startsWith('file')) {
                return;
            }

            const versionApiPath = '/webcontroller/HealthCheck/version/advanced';

            const url = `${protocol}//${hostname}${versionApiPath}`;
            logger.info(`version-handler: Trying to get version info for the URL: ${url}`);

            const request = net.request(url);
            request.on('response', (res) => {

                let body: string = '';
                res.on('data', (d: Buffer) => {
                    body += d;
                });

                res.on('end', () => {
                    try {
                        this.serverVersionInfo = JSON.parse(body)[0];
                        this.versionInfo.clientVersion = this.serverVersionInfo['Implementation-Version'] || this.versionInfo.clientVersion;
                        this.versionInfo.buildNumber = this.serverVersionInfo['Implementation-Build'] || this.versionInfo.buildNumber;
                        logger.info(`version-handler: Updated version info from server! ${JSON.stringify(this.versionInfo)}`);
                        resolve(this.versionInfo);
                    } catch (error) {
                        logger.error(`version-handler: Error getting version data from the server! ${error}`);
                        resolve(this.versionInfo);
                        return;
                    }
                });

                res.on('error', (error: Error) => {
                    logger.error(`version-handler: Error getting version data from the server! ${error}`);
                    resolve(this.versionInfo);
                    return;
                });

            });

            request.on('error', (error: Error) => {
                logger.error(`version-handler: Error getting version data from the server! ${error}`);
                resolve(this.versionInfo);
                return;
            });

            request.on('close', () => {
                logger.info(`version-handler: Request closed!!`);
            });

            request.on('finish', () => {
                logger.info(`version-handler: Request finished!!`);
            });

            request.end();

            /* Get SFE version */
            const urlSfeVersion = `${protocol}//${hostname}/client/version.json`;
            logger.info(`version-handler: Trying to get SFE version info for the URL: ${urlSfeVersion}`);

            const requestSfeVersion = net.request(urlSfeVersion);
            requestSfeVersion.on('response', (res) => {

                let body: string = '';
                res.on('data', (d: Buffer) => {
                    body += d;
                });

                res.on('end', () => {
                    try {
                        this.sfeVersionInfo = JSON.parse(body);
                        const key = 'version';

                        this.versionInfo.sfeVersion = this.sfeVersionInfo[key];

                        logger.info(`version-handler: Updated SFE version info from server! ${JSON.stringify(this.versionInfo)}`);
                        resolve(this.versionInfo);
                    } catch (error) {
                        logger.error(`version-handler: Error getting SFE version data from the server! ${error}`);
                        resolve(this.versionInfo);
                        return;
                    }
                });

                res.on('error', (error: Error) => {
                    logger.error(`version-handler: Error getting SFE version data from the server! ${error}`);
                    resolve(this.versionInfo);
                    return;
                });

            });

            requestSfeVersion.on('error', (error: Error) => {
                logger.error(`version-handler: Error getting SFE version data from the server! ${error}`);
                resolve(this.versionInfo);
                return;
            });

            requestSfeVersion.on('close', () => {
                logger.info(`version-handler: Request closed!!`);
            });

            requestSfeVersion.on('finish', () => {
                logger.info(`version-handler: Request finished!!`);
            });

            requestSfeVersion.end();
        });
    }

}

const versionHandler = new VersionHandler();

export { versionHandler, IVersionInfo };
