import { shallow } from 'enzyme';
import * as React from 'react';
import AboutApp from '../src/renderer/components/about-app';
import { ipcRenderer } from './__mocks__/electron';

describe('about app', () => {
    const aboutAppDataLabel = 'about-app-data';
    const aboutDataMock = {
        buildNumber: '4.x.x',
        clientVersion: '1',
        version: 'x.x.x',
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
        const wrapper = shallow(React.createElement(AboutApp));
        expect(wrapper).toMatchSnapshot();
    });

    it('should call `about-app-data` event when component is mounted', () => {
        const spy = jest.spyOn(ipcRenderer, onLabelEvent);
        shallow(React.createElement(AboutApp));
        expect(spy).toBeCalledWith(aboutAppDataLabel, expect.any(Function));
    });

    it('should remove listener `about-app-data` when component is unmounted', () => {
        const spyMount = jest.spyOn(ipcRenderer, onLabelEvent);
        const spyUnmount = jest.spyOn(ipcRenderer, removeListenerLabelEvent);
        const wrapper = shallow(React.createElement(AboutApp));
        expect(spyMount).toBeCalledWith(aboutAppDataLabel, expect.any(Function));
        wrapper.unmount();
        expect(spyUnmount).toBeCalledWith(aboutAppDataLabel, expect.any(Function));
    });

    it('should call `updateState` when component is mounted', () => {
        const spy = jest.spyOn(AboutApp.prototype, 'setState');
        shallow(React.createElement(AboutApp));
        ipcRenderer.send('about-app-data', aboutDataMock);
        expect(spy).toBeCalledWith(aboutDataMock);
    });
});
