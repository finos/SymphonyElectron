/**
 * Created by vishwas on 10/05/17.
 */
const protocolHandler = require('../js/protocolHandler');
const electron = require('./__mocks__/electron');

describe('protocol handler', function () {

    const url = 'symphony://?userId=100001';
    const nonProtocolUrl = 'sy://abc=123';

    const mainProcess = electron.ipcMain;
    const protocolWindow = electron.ipcRenderer;

    beforeAll(function () {
        protocolHandler.setProtocolWindow(protocolWindow);
    });

    it('process a protocol action', function (done) {

        const spy = jest.spyOn(protocolHandler, 'processProtocolAction');
        protocolHandler.processProtocolAction(url);
        expect(spy).toHaveBeenCalledWith(url);

        done();

    });

    it('protocol url should be undefined by default', function (done) {
        expect(protocolHandler.getProtocolUrl()).toBeUndefined();
        done();
    });

    it('protocol handler open url should be called', function (done) {

        const spy = jest.spyOn(mainProcess, 'send');
        mainProcess.send('open-url', url);

        expect(spy).toHaveBeenCalled();

        done();

    });

    it('protocol handler open url should be called', function(done) {
        
        const spy = jest.spyOn(mainProcess, 'send');
        mainProcess.send('open-url', nonProtocolUrl);

        expect(spy).toHaveBeenCalled();
        
        done();

    });

    it('check protocol action should be called', function (done) {

        const spy = jest.spyOn(protocolHandler, 'checkProtocolAction');
        const setSpy = jest.spyOn(protocolHandler, 'setProtocolUrl');

        protocolHandler.setProtocolUrl(url);
        expect(setSpy).toHaveBeenCalledWith(url);

        protocolHandler.checkProtocolAction();
        expect(spy).toHaveBeenCalled();

        expect(protocolHandler.getProtocolUrl()).toBeUndefined();

        done();

    });

    it('check protocol action should be called when we have an incorrect protocol url', function (done) {

        const spy = jest.spyOn(protocolHandler, 'checkProtocolAction');
        const setSpy = jest.spyOn(protocolHandler, 'setProtocolUrl');

        protocolHandler.setProtocolUrl(nonProtocolUrl);
        expect(setSpy).toHaveBeenCalledWith(nonProtocolUrl);

        protocolHandler.checkProtocolAction();
        expect(spy).toHaveBeenCalled();

        expect(protocolHandler.getProtocolUrl()).toBeUndefined();

        done();

    });

    it('check protocol action should be called when the protocol url is undefined', function(done) {
        
        const spy = jest.spyOn(protocolHandler, 'checkProtocolAction');
        const setSpy = jest.spyOn(protocolHandler, 'setProtocolUrl');

        protocolHandler.setProtocolUrl(undefined);
        expect(setSpy).toHaveBeenCalledWith(undefined);

        protocolHandler.checkProtocolAction();
        expect(spy).toHaveBeenCalled();

        expect(protocolHandler.getProtocolUrl()).toBeUndefined();

        done();

    });

    it('should cache the protocol url if the protocol window is not defined yet', (done) => {
        protocolHandler.setProtocolWindow(null);
        const setSpy = jest.spyOn(protocolHandler, 'setProtocolUrl');
        protocolHandler.setProtocolUrl(url);

        protocolHandler.checkProtocolAction();
        expect(setSpy).toHaveBeenCalled();

        done();
    });

});