import { shallow } from 'enzyme';
import * as React from 'react';
import AboutApp from '../src/renderer/components/about-app';
import { ipcRenderer } from './__mocks__/electron';

describe('about app', () => {
    const aboutAppDataLabel = 'about-app-data';
    const aboutDataMock = { buildNumber: '4.x.x', clientVersion: '1', version: 'x.x.x' };
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
