import { shallow } from 'enzyme';
import * as React from 'react';
import ScreenSharingIndicator from '../src/renderer/components/screen-sharing-indicator';
import { ipcRenderer } from './__mocks__/electron';

jest.mock('../src/common/env', () => {
    return {
        isWindowsOS: false,
        isMac: true,
    };
});

describe('screen sharing indicator', () => {
    // events
    const onEventLabel = 'on';
    const removeListenerEventLabel = 'removeListener';
    const sendEventLabel = 'send';
    const symphonyAPIEventLabel = 'symphony-api';
    const screenSharingIndicatorDataEventLabel = 'screen-sharing-indicator-data';
    // state moked
    const screenSharingIndicatorStateMock = { id: 10 };

    it('should render correctly', () => {
        const wrapper = shallow(React.createElement(ScreenSharingIndicator));
        expect(wrapper).toMatchSnapshot();
    });

    it('should call `close` correctly', () => {
        const customSelector = 'a.hide-button';
        const closeIpcRendererMock = {
            cmd: 'close-window',
            windowType: 'screen-sharing-indicator',
        };
        const spy = jest.spyOn(ipcRenderer, sendEventLabel);
        const wrapper = shallow(React.createElement(ScreenSharingIndicator));
        wrapper.find(customSelector).simulate('click');
        expect(spy).lastCalledWith(symphonyAPIEventLabel, closeIpcRendererMock);
    });

    it('should call `stopScreenShare` correctly', () => {
        const customSelector = 'button.stop-sharing-button';
        const stopScreenSharingEventLabel = 'stop-screen-sharing';
        const spy = jest.spyOn(ipcRenderer, sendEventLabel);
        const wrapper = shallow(React.createElement(ScreenSharingIndicator));
        wrapper.setState(screenSharingIndicatorStateMock);
        wrapper.find(customSelector).simulate('click');
        expect(spy).lastCalledWith(stopScreenSharingEventLabel, 10);
    });

    it('should call `updateState` correctly', () => {
        const setStateEventLabel = 'setState';
        const spy = jest.spyOn(ScreenSharingIndicator.prototype, setStateEventLabel);
        shallow(React.createElement(ScreenSharingIndicator));
        ipcRenderer.send(screenSharingIndicatorDataEventLabel, screenSharingIndicatorStateMock);
        expect(spy).lastCalledWith({ id: 10 });
    });

    describe('`screen-sharing-indicator-data` event', () => {

        it('should call `screen-sharing-indicator-data` when component is mounted', () => {
            const spy = jest.spyOn(ipcRenderer, onEventLabel);
            shallow(React.createElement(ScreenSharingIndicator));
            expect(spy).lastCalledWith(screenSharingIndicatorDataEventLabel, expect.any(Function));
        });

        it('should call `screen-sharing-indicator-data` when component is unmounted', () => {
            const spy = jest.spyOn(ipcRenderer, removeListenerEventLabel);
            shallow(React.createElement(ScreenSharingIndicator)).unmount();
            expect(spy).toBeCalledWith(screenSharingIndicatorDataEventLabel, expect.any(Function));
        });
    });
});
