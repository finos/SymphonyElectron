import { shallow } from 'enzyme';
import * as React from 'react';
import WindowsTitleBar from '../src/renderer/components/windows-title-bar';
import { ipcRenderer, remote } from './__mocks__/electron';

describe('windows title bar', () => {
    beforeEach(() => {
        // state initial
        jest.spyOn(remote, 'getCurrentWindow').mockImplementation(() => {
            return {
                isFullScreen: jest.fn(() => {
                    return false;
                }),
                isMaximized: jest.fn(() => {
                    return false;
                }),
                on: jest.fn(),
                removeListener: jest.fn(),
                isDestroyed: jest.fn(() => {
                    return false;
                }),
                close: jest.fn(),
                maximize: jest.fn(),
                minimize: jest.fn(),
                unmaximize: jest.fn(),
                setFullScreen: jest.fn(),
            };
        });
    });

    const getCurrentWindowFnLabel = 'getCurrentWindow';
    const onEventLabel = 'on';
    const maximizeEventLabel = 'maximize';
    const unmaximizeEventLabel = 'unmaximize';
    const enterFullScreenEventLabel = 'enter-full-screen';
    const leaveFullScreenEventLabel = 'leave-full-screen';

    it('should render correctly', () => {
        const wrapper = shallow(React.createElement(WindowsTitleBar));
        expect(wrapper).toMatchSnapshot();
    });

    it('should mount correctly', () => {
        const wrapper = shallow(React.createElement(WindowsTitleBar));
        const instance: any = wrapper.instance();
        const window = instance.window;
        const spy = jest.spyOn(remote, getCurrentWindowFnLabel);
        const spyWindow = jest.spyOn(window, onEventLabel);
        expect(spy).toBeCalled();
        expect(spyWindow).nthCalledWith(1, maximizeEventLabel, expect.any(Function));
        expect(spyWindow).nthCalledWith(2, unmaximizeEventLabel, expect.any(Function));
        expect(spyWindow).nthCalledWith(3, enterFullScreenEventLabel, expect.any(Function));
        expect(spyWindow).nthCalledWith(4, leaveFullScreenEventLabel, expect.any(Function));
    });

    it('should call `close` correctly', () => {
        const fnLabel = 'close';
        const titleLabel = 'Close';
        const wrapper = shallow(React.createElement(WindowsTitleBar));
        const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
        const instance: any = wrapper.instance();
        const window = instance.window;
        const spy = jest.spyOn(window, fnLabel);
        wrapper.find(customSelector).simulate('click');
        expect(spy).toBeCalled();
    });

    it('should call `minimize` correctly', () => {
        const fnLabel = 'minimize';
        const titleLabel = 'Minimize';
        const wrapper = shallow(React.createElement(WindowsTitleBar));
        const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
        const instance: any = wrapper.instance();
        const window = instance.window;
        const spy = jest.spyOn(window, fnLabel);
        wrapper.find(customSelector).simulate('click');
        expect(spy).toBeCalled();
    });

    it('should call `showMenu` correctly', () => {
        const titleLabel = 'Menu';
        const symphonyApiLabel = 'symphony-api';
        const expectedValue = {
            cmd: 'popup-menu',
        };
        const spy = jest.spyOn(ipcRenderer, 'send');
        const customSelector = `button.hamburger-menu-button[title="${titleLabel}"]`;
        const wrapper = shallow(React.createElement(WindowsTitleBar));
        wrapper.find(customSelector).simulate('click');
        expect(spy).toBeCalledWith(symphonyApiLabel, expectedValue);
    });

    it('should call `onMouseDown` correctly', () => {
        const titleLabel = 'Menu';
        const customSelector = `button.hamburger-menu-button[title="${titleLabel}"]`;
        const wrapper = shallow(React.createElement(WindowsTitleBar));
        const event = {
            preventDefault: jest.fn(),
        }
        const spy = jest.spyOn(event, 'preventDefault');
        wrapper.find(customSelector).simulate('mouseDown', event);
        expect(spy).toBeCalled();
    });

    it('should call `updateState` correctly', () => {
        const wrapper = shallow(React.createElement(WindowsTitleBar));
        const spy = jest.spyOn(wrapper, 'setState');
        const instance: any = wrapper.instance();
        instance.updateState({ isMaximized: false });
        expect(spy).lastCalledWith(expect.any(Function));
    });

    describe('componentDidMount event', () => {
        beforeEach(() => {
            document.body.innerHTML = `<div id="content-wrapper"></div>`;
        });

        it('should call `componentDidMount` when isFullScreen', () => {
            const spy = jest.spyOn(document.body.style, 'removeProperty');
            const expectedValue = 'margin-top';
            // changing state before componentDidMount
            jest.spyOn(remote, 'getCurrentWindow').mockImplementation(() => {
                return {
                    isFullScreen: jest.fn(() => {
                        return true;
                    }),
                    isMaximized: jest.fn(() => {
                        return false;
                    }),
                    on: jest.fn(),
                    removeListener: jest.fn(),
                    isDestroyed: jest.fn(() => {
                        return false;
                    }),
                    close: jest.fn(),
                    maximize: jest.fn(),
                    minimize: jest.fn(),
                    unmaximize: jest.fn(),
                    setFullScreen: jest.fn(),
                };
            });
            shallow(React.createElement(WindowsTitleBar));
            expect(spy).toBeCalledWith(expectedValue);
        });
    });

    describe('maximize functions', () => {
        it('should call `unmaximize` correctly when is not full screen', () => {
            const titleLabel = 'Restore';
            const unmaximizeFn = 'unmaximize';
            const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
            const wrapper = shallow(React.createElement(WindowsTitleBar));
            const instance: any = wrapper.instance();
            const window = instance.window;
            const spy = jest.spyOn(window, unmaximizeFn);
            wrapper.setState({ isMaximized: true });
            wrapper.find(customSelector).simulate('click');
            expect(spy).toBeCalled();
        });

        it('should call `unmaximize` correctly when is full screen', () => {
            const windowSpyFn = 'setFullScreen';
            const titleLabel = 'Restore';
            const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
            const wrapper = shallow(React.createElement(WindowsTitleBar));
            const instance: any = wrapper.instance();
            const window = instance.window;
            const spy = jest.spyOn(window, windowSpyFn);
            window.isFullScreen = jest.fn(() => {
                return true;
            });
            wrapper.setState({ isMaximized: true });
            wrapper.find(customSelector).simulate('click');
            expect(spy).toBeCalledWith(false);
        });

        it('should call maximize correctly when it is not in full screen', () => {
            const titleLabel = 'Maximize';
            const maximizeFn = 'maximize';
            const expectedState = { isMaximized: true };
            const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
            const wrapper = shallow(React.createElement(WindowsTitleBar));
            const instance: any = wrapper.instance();
            const window = instance.window;
            const spyWindow = jest.spyOn(window, maximizeFn);
            const spyState = jest.spyOn(wrapper, 'setState');
            wrapper.find(customSelector).simulate('click');
            expect(spyWindow).toBeCalled();
            expect(spyState).lastCalledWith(expectedState);
        });
    });
});
