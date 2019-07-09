import { shallow } from 'enzyme';
import * as React from 'react';
import MoreInfo from '../src/renderer/components/more-info';
import { ipcRenderer } from './__mocks__/electron';

describe('more info', () => {
    const moreInfoDataLabel = 'more-info-data';
    const moreInfoDataMock = {
        clientVersion: '1.55.2',
        buildNumber: '12333',
        sdaVersion: '3.8.0',
        sdaBuildNumber: '0',
        electronVersion: '3.1.11',
        chromeVersion: '66.789',
        v8Version: '6.7.8',
        nodeVersion: '10.12',
        openSslVersion: '1.2.3',
        zlibVersion: '4.5.6',
        uvVersion: '7.8',
        aresVersion: '9.10',
        httpParserVersion: '11.12',
        swiftSearchVersion: '1.55.3-beta.1',
        swiftSerchSupportedVersion: '1.55.3',
    };
    const onLabelEvent = 'on';
    const removeListenerLabelEvent = 'removeListener';

    it('should render correctly', () => {
        const wrapper = shallow(React.createElement(MoreInfo));
        expect(wrapper).toMatchSnapshot();
    });

    it('should call `more-info-data` event when component is mounted', () => {
        const spy = jest.spyOn(ipcRenderer, onLabelEvent);
        shallow(React.createElement(MoreInfo));
        expect(spy).toBeCalledWith(moreInfoDataLabel, expect.any(Function));
    });

    it('should remove listener `more-info-data` when component is unmounted', () => {
        const spyMount = jest.spyOn(ipcRenderer, onLabelEvent);
        const spyUnmount = jest.spyOn(ipcRenderer, removeListenerLabelEvent);
        const wrapper = shallow(React.createElement(MoreInfo));
        expect(spyMount).toBeCalledWith(moreInfoDataLabel, expect.any(Function));
        wrapper.unmount();
        expect(spyUnmount).toBeCalledWith(moreInfoDataLabel, expect.any(Function));
    });

    it('should call `updateState` when component is mounted', () => {
        const spy = jest.spyOn(MoreInfo.prototype, 'setState');
        shallow(React.createElement(MoreInfo));
        ipcRenderer.send('more-info-data', moreInfoDataMock);
        expect(spy).toBeCalledWith(moreInfoDataMock);
    });
});
