jest.mock('electron-log');

jest.mock('../src/app/window-handler', () => {
    return {
        windowHandler: {
            setIsAutoReload: jest.fn(() => true),
        },
    };
});

jest.mock('../src/app/window-utils', () => {
    return {
        windowExists: jest.fn(() => true),
    };
});

describe('download handler', () => {
    let downloadHandlerInstance;

    beforeEach(() => {
        jest.resetModules();
        // I did it for reset module imported between tests
        const { downloadHandler } = require('../src/app/download-handler');
        downloadHandlerInstance = downloadHandler;
    });

    afterAll((done) => {
        done();
    });

    it('should call `sendDownloadCompleted` when download succeeds', () => {
        const spy: jest.SpyInstance = jest.spyOn(downloadHandlerInstance, 'sendDownloadCompleted')
            .mockImplementation(() => jest.fn());

        const data: any = {
            _id: '121312-123912321-1231231',
            savedPath: '/abc/def/123.txt',
            total: '1234556',
            fileName: 'Test.txt',
        };

        downloadHandlerInstance.onDownloadSuccess(data);
        expect(spy).toBeCalled();
    });

    it('should call `sendDownloadFailed` when download fails', () => {
        const spy: jest.SpyInstance = jest.spyOn(downloadHandlerInstance, 'sendDownloadFailed')
            .mockImplementation(() => jest.fn());

        downloadHandlerInstance.onDownloadFailed();
        expect(spy).toBeCalled();
    });

});
