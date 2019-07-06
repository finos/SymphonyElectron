import { buildNumber, clientVersion, optionalDependencies, searchAPIVersion, version } from '../package.json';

describe('version-handler', () => {
    let versionHandlerInstance;
    const verInfo = {
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

    beforeEach(() => {
        jest.resetModules();
        const { versionHandler } = require('../src/app/version-handler');
        versionHandlerInstance = versionHandler;
    });

    it('should get version info', () => {
        const spy: jest.SpyInstance = jest.spyOn(versionHandlerInstance, 'getClientVersion');
        const versionInfo = versionHandlerInstance.getVersionInfo();
        expect(spy).not.toBeCalled();
        expect(versionInfo).toEqual(verInfo);
    });

    it('should call get request', () => {
        const https = require('https');
        const spy: jest.SpyInstance = jest.spyOn(https, 'get');
        versionHandlerInstance.getClientVersion();
        expect(spy).toBeCalled();
    });

});
