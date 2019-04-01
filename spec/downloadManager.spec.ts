import { shallow, ShallowWrapper } from 'enzyme';
import * as React from 'react';
import DownloadManager from '../src/renderer/components/download-manager';

describe('download manager', () => {
    it('should render correctly', () => {
        const wrapper = shallow(React.createElement(DownloadManager));

        expect(wrapper).toMatchSnapshot();
    });

    it('should call `close` correctly', () => {
        const spy: jest.SpyInstance = jest.spyOn(DownloadManager.prototype, 'setState');
        const wrapper: ShallowWrapper = shallow(React.createElement(DownloadManager));

        wrapper.find('#close-download-bar').simulate('click');

        expect(spy).toBeCalledWith({ items: [], showMainComponent: true });
    });

    it('should call `injectItem` correctly', () => {
        const { ipcRenderer } = require('./__mocks__/electron');
        const spy: jest.SpyInstance = jest.spyOn(DownloadManager.prototype, 'setState');
        const objectDownloadCompleted: object = {
            _id: 1,
            fileName: 'test.png',
            savedPath: 'path://test',
            total: 1,
            flashing: true,
        };

        shallow(React.createElement(DownloadManager));

        ipcRenderer.send('downloadCompleted', objectDownloadCompleted);

        expect(spy).toBeCalledWith({
            items: [{
                _id: 1,
                fileName: 'test.png',
                savedPath: 'path://test',
                total: 1,
                flashing: true,
            }], showMainComponent: true,
        });
    });

    describe('download element ready', () => {
        let wrapper: ShallowWrapper;
        beforeEach(() => {
            wrapper = shallow(React.createElement(DownloadManager));

            wrapper.setState({
                items: [
                    {
                        _id: 1,
                        fileName: 'test.png',
                        savedPath: 'path://test',
                        total: 1,
                        flashing: true,
                    }],
            });
        });

        it('should exist `download-element` class when there are items', () => {
            expect(wrapper.find('.download-element')).toHaveLength(1);
        });

        it('should call `onOpenFile` correctly', () => {
            const { ipcRenderer } = require('./__mocks__/electron');
            const sendEventLabel: string = 'send';
            const spy: jest.SpyInstance = jest.spyOn(ipcRenderer, sendEventLabel);

            wrapper.find('#download-open').simulate('click');

            expect(spy).toBeCalledWith('symphony-api', {
                cmd: 'download-manager-action',
                path: 'path://test',
                type: 'open',
             });
        });

        it('should call `showInFinder` correctly', () => {
            const { ipcRenderer } = require('./__mocks__/electron');
            const sendEventLabel: string = 'send';
            const spy: jest.SpyInstance = jest.spyOn(ipcRenderer, sendEventLabel);

            wrapper.find('#download-show-in-folder').simulate('click');

            expect(spy).toBeCalledWith('symphony-api', {
                cmd: 'download-manager-action',
                path: 'path://test',
                type: 'show',
             });
        });
    });

    describe('download completed event', () => {
        const { ipcRenderer } = require('./__mocks__/electron');
        const downloadCompletedLabelEvent: string = 'downloadCompleted';
        const onLabelEvent: string = 'on';
        const removeListenerLabelEvent: string = 'removeListener';

        it('should call the `downloadCompleted event when component is mounted', () => {
            const spy: jest.SpyInstance = jest.spyOn(ipcRenderer, onLabelEvent);

            shallow(React.createElement(DownloadManager));

            expect(spy).toBeCalledWith(downloadCompletedLabelEvent, expect.any(Function));
        });

        it('should remove listen `downloadCompleted` when component is unmounted', () => {
            const spyMount: jest.SpyInstance = jest.spyOn(ipcRenderer, onLabelEvent);
            const spyUnmount: jest.SpyInstance = jest.spyOn(ipcRenderer, removeListenerLabelEvent);
            const wrapper: ShallowWrapper = shallow(React.createElement(DownloadManager));

            expect(spyMount).toBeCalledWith(downloadCompletedLabelEvent, expect.any(Function));

            wrapper.unmount();

            expect(spyUnmount).toBeCalledWith(downloadCompletedLabelEvent, expect.any(Function));
        });
    });
});
