import { shallow } from 'enzyme';
import * as React from 'react';
import SnackBar from '../src/renderer/components/snack-bar';
import { ipcRenderer } from './__mocks__/electron';

describe('snack bar', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.restoreAllMocks();
    });
    // events label
    const onEventLabel = 'on';
    const removeListenerEventLabel = 'removeListener';
    const windowEnterFullScreenEventLabel = 'window-enter-full-screen';
    const windowLeaveFullScreenEventLabel = 'window-leave-full-screen';

    it('should render correctly', () => {
        const wrapper = shallow(React.createElement(SnackBar));
        expect(wrapper).toMatchSnapshot();
    });

    it('should call mount correctly', () => {
        const spy = jest.spyOn(ipcRenderer, onEventLabel);
        shallow(React.createElement(SnackBar));
        expect(spy).nthCalledWith(1, windowEnterFullScreenEventLabel, expect.any(Function));
        expect(spy).nthCalledWith(2, windowLeaveFullScreenEventLabel, expect.any(Function));
    });

    it('should call unmount correctly', () => {
        const spy = jest.spyOn(ipcRenderer, removeListenerEventLabel);
        shallow(React.createElement(SnackBar)).unmount();
        expect(spy).nthCalledWith(1, windowEnterFullScreenEventLabel, expect.any(Function));
        expect(spy).nthCalledWith(2, windowLeaveFullScreenEventLabel, expect.any(Function));
    });

    it('should call `removeSnackBar` correctly', () => {
        const spy = jest.spyOn(SnackBar.prototype, 'setState');
        const expectedValue = { show: false };
        shallow(React.createElement(SnackBar));
        ipcRenderer.send(windowLeaveFullScreenEventLabel, null);
        expect(spy).lastCalledWith(expectedValue);
        jest.runOnlyPendingTimers();
    });

    it('should call `showSnackBar` correctly', () => {
        const spy = jest.spyOn(SnackBar.prototype, 'setState');
        const expectedValueFirst = { show: true };
        const expectedValueSecond = { show: false };
        shallow(React.createElement(SnackBar));
        ipcRenderer.send(windowEnterFullScreenEventLabel, null);
        expect(setTimeout).lastCalledWith(expect.any(Function), 3000);
        expect(spy).nthCalledWith(1, expectedValueFirst);
        jest.runOnlyPendingTimers();
        expect(spy).nthCalledWith(2, expectedValueSecond);
    });
});
