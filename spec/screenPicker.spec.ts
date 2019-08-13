import { shallow } from 'enzyme';
import * as React from 'react';
import ScreenPicker from '../src/renderer/components/screen-picker';
import { ipcRenderer } from './__mocks__/electron';

jest.mock('../src/common/env', () => {
    return {
        isWindowsOS: false,
        isLinux: false,
        isMac: true,
    };
});

describe('screen picker', () => {
        const keyCode = {
            pageDown: { keyCode: 34 },
            rightArrow: { keyCode: 39 },
            pageUp: { keyCode: 33 },
            leftArrow: { keyCode: 37 },
            homeKey: { keyCode: 36 },
            upArrow: { keyCode: 38 },
            endKey: { keyCode: 35 },
            downArrow: { keyCode: 40 },
            enterKey: { keyCode: 13 },
            escapeKey: { keyCode: 27 },
            random: { keyCode: 100 },
        };
        const sendEventLabel = 'send';
        const screenSourceSelectedLabel = 'screen-source-selected';
        const symphonyApiLabel = 'symphony-api';
        const screenTabCustomSelector = '#screen-tab';
        const applicationTabCustomSelector = '#application-tab';
        const screenPickerDataLabel = 'screen-picker-data';
        const events = {
            keyup: jest.fn(),
        };
        const stateMock = {
            sources: [
                { display_id: '0', id: '0', name: 'Application screen 0', thumbnail: undefined },
                { display_id: '1', id: '1', name: 'Application screen 1', thumbnail: undefined },
                { display_id: '2', id: '2', name: 'Application screen 2', thumbnail: undefined },
            ],
                selectedSource: { display_id: '1', id: '1', name: 'Application screen 1', thumbnail: undefined },
        };

    it('should render correctly', () => {
        const wrapper = shallow(React.createElement(ScreenPicker));
        expect(wrapper).toMatchSnapshot();
    });

    it('should call `close` correctly', () => {
        const wrapper = shallow(React.createElement(ScreenPicker));
        const spy = jest.spyOn(ipcRenderer, sendEventLabel);
        const customSelector = 'button.ScreenPicker-cancel-button';
        const expectedValue = { cmd: 'close-window', windowType: 'screen-picker' };
        wrapper.find(customSelector).simulate('click');
        expect(spy).nthCalledWith(1, screenSourceSelectedLabel, null);
        expect(spy).nthCalledWith(2, symphonyApiLabel, expectedValue);
    });

    it('should call `submit` correctly', () => {
        const wrapper = shallow(React.createElement(ScreenPicker));
        const spy = jest.spyOn(ipcRenderer, sendEventLabel);
        const selectedSource = { display_id: '1', id: '1', name: 'Entire screen', thumbnail: undefined };
        const customSelector = 'button.ScreenPicker-share-button';
        wrapper.setState({ selectedSource });
        wrapper.find(customSelector).simulate('click');
        expect(spy).lastCalledWith(screenSourceSelectedLabel, selectedSource);
    });

    it('should call `updateState` correctly', () => {
        const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
        const updateState = {
            sources: [ { display_id: '0', id: '0', name: 'Entire screen', thumbnail: undefined } ],
            selectedSource: undefined,
            selectedTab: 'screens',
        };
        shallow(React.createElement(ScreenPicker));
        ipcRenderer.send(screenPickerDataLabel, updateState);
        expect(spy).toBeCalledWith(updateState);
    });

    describe('`onToggle` event', () => {
        const entireScreenStateMock = {
            sources: [
                { display_id: '0', id: '0', name: 'Entire screen', thumbnail: undefined },
            ],
            selectedSource: { display_id: '0', id: '0', name: 'Entire screen', thumbnail: undefined },
        };
        const applicationScreenStateMock = {
            sources: [
                { display_id: '', id: '1', name: 'Application 1', thumbnail: undefined },
            ],
            selectedSource: { display_id: '', id: '1', name: 'Application 1', thumbnail: undefined },
        };

        it('should call `onToggle` when screen tab is changed', () => {
            const wrapper = shallow(React.createElement(ScreenPicker));
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedTab: 'screens' };
            wrapper.setState(entireScreenStateMock);
            wrapper.find(screenTabCustomSelector).simulate('change');
            expect(spy).lastCalledWith(expectedValue);
        });

        it('should call `onToggle` when application tab is changed', () => {
            const wrapper = shallow(React.createElement(ScreenPicker));
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedTab: 'applications' };
            wrapper.setState(applicationScreenStateMock);
            wrapper.find(applicationTabCustomSelector).simulate('change');
            expect(spy).lastCalledWith(expectedValue);
        });
    });

    describe('onSelect event', () => {
        it('should call `onSelect` when `ScreenPicker-item-container` in Entire screen is clicked', () => {
            const wrapper = shallow(React.createElement(ScreenPicker));
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '0', fileName: 'fullscreen', id: '0', name: 'Entire screen', thumbnail: undefined }};
            const customSelector = '.ScreenPicker-item-container';
            const applicationScreenStateMock = {
                sources: [
                    { display_id: '0', id: '0', name: 'Entire screen', thumbnail: undefined },
                    { display_id: '1', id: '1', name: 'Application screen 1', thumbnail: undefined },
                    { display_id: '2', id: '2', name: 'Application screen 2', thumbnail: undefined },
                ],
                selectedSource: { display_id: '1', fileName: 'fullscreen', id: '1', name: 'Application screen 1', thumbnail: undefined },
            };
            wrapper.setState(applicationScreenStateMock);
            wrapper.find(customSelector).first().simulate('click');
            expect(spy).lastCalledWith(expectedValue);
        });

        it('should call `onSelect` when `ScreenPicker-item-container` in Application screen is clicked', () => {
            const wrapper = shallow(React.createElement(ScreenPicker));
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '2', fileName: 'fullscreen', id: '2', name: 'Application screen 2', thumbnail: undefined }};
            const customSelector = '.ScreenPicker-item-container';
            const applicationScreenStateMock = {
                sources: [
                    { display_id: '0', id: '0', name: 'Entire screen', thumbnail: undefined },
                    { display_id: '1', id: '1', name: 'Application screen 1', thumbnail: undefined },
                    { display_id: '2', id: '2', name: 'Application screen 2', thumbnail: undefined },
                ],
                selectedSource: { display_id: '1', fileName: 'fullscreen', id: '1', name: 'Application screen 1', thumbnail: undefined },
            };
            wrapper.setState(applicationScreenStateMock);
            wrapper.find(customSelector).at(2).simulate('click');
            expect(spy).lastCalledWith(expectedValue);
        });
    });

    describe('handle keyUp', () => {
        beforeAll(() => {
            document.addEventListener = jest.fn((event, cb) => {
                events[event] = cb;
            });
        });

        it('should register `keyup` when component is mounted', () => {
            const spy = jest.spyOn(document, 'addEventListener');
            shallow(React.createElement(ScreenPicker));
            events.keyup(keyCode.random);
            expect(spy).lastCalledWith('keyup', expect.any(Function), true);
        });

        it('should remove event `keyup` when component is unmounted', () => {
            const spy = jest.spyOn(document, 'removeEventListener');
            shallow(React.createElement(ScreenPicker)).unmount();
            expect(spy).lastCalledWith('keyup', expect.any(Function), true);
        });

        it('should call `handleKeyUpPress` pageDown key correctly', () => {
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '2', fileName: 'fullscreen', id: '2', name: 'Application screen 2', thumbnail: undefined }};
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.pageDown);
            expect(spy).lastCalledWith(expectedValue);
        });

        it('should call `handleKeyUpPress` right arrow key correctly', () => {
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '2', fileName: 'fullscreen', id: '2', name: 'Application screen 2', thumbnail: undefined }};
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.rightArrow);
            expect(spy).lastCalledWith(expectedValue);
        });

        it('should call `handleKeyUpPress` pageUp key correctly', () => {
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '0', fileName: 'fullscreen', id: '0', name: 'Application screen 0', thumbnail: undefined }};
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.pageUp);
            expect(spy).lastCalledWith(expectedValue);
        });

        it('should call `handleKeyUpPress` left arrow key correctly', () => {
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '0', fileName: 'fullscreen', id: '0', name: 'Application screen 0', thumbnail: undefined }};
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.leftArrow);
            expect(spy).lastCalledWith(expectedValue);
        });

        it('should call `handleKeyUpPress` down arrow key correctly', () => {
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '0', fileName: 'fullscreen', id: '0', name: 'Application screen 0', thumbnail: undefined }};
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.downArrow);
            expect(spy).lastCalledWith(expectedValue);
        });

        it('should call `handleKeyUpPress` up arrow key correctly', () => {
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '2', fileName: 'fullscreen', id: '2', name: 'Application screen 2', thumbnail: undefined }};
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.upArrow);
            expect(spy).lastCalledWith(expectedValue);
        });

        it('should call `handleKeyUpPress` enter key correctly', () => {
            const spy = jest.spyOn(ipcRenderer, sendEventLabel);
            const expectedValue = { display_id: '1', id: '1', name: 'Application screen 1', thumbnail: undefined };
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.enterKey);
            expect(spy).lastCalledWith(screenSourceSelectedLabel, expectedValue);
        });

        it('should call `handleKeyUpPress` escape key correctly', () => {
            const spy = jest.spyOn(ipcRenderer, sendEventLabel);
            const expectedValue = { cmd: 'close-window', windowType: 'screen-picker' };
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.escapeKey);
            expect(spy).nthCalledWith(1, screenSourceSelectedLabel, null);
            expect(spy).nthCalledWith(2, symphonyApiLabel, expectedValue);
        });

        it('should call `handleKeyUpPress` end key correctly', () => {
            const spy = jest.spyOn(ScreenPicker.prototype, 'setState');
            const expectedValue = { selectedSource: { display_id: '0', fileName: 'fullscreen', id: '0', name: 'Application screen 0', thumbnail: undefined }};
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState(stateMock);
            events.keyup(keyCode.endKey);
            expect(spy).lastCalledWith(expectedValue);
        });

    });

    describe('tab titles', () => {
        it('should show `application-tab` when display_id is empty', () => {
            const wrapper = shallow(React.createElement(ScreenPicker));
            const applicationScreenStateMock = {
                sources: [
                    { display_id: '', id: '1', name: 'Application Screen', thumbnail: undefined },
                    { display_id: '', id: '2', name: 'Application Screen 2', thumbnail: undefined },
                    { display_id: '', id: '3', name: 'Application Screen 3', thumbnail: undefined },
                ],
            };
            wrapper.setState(applicationScreenStateMock);
            expect(wrapper.find(applicationTabCustomSelector)).toHaveLength(1);
            expect(wrapper.find(screenTabCustomSelector)).toHaveLength(0);
        });

        it('should show `screen-tab` when source name is Entire screen', () => {
            const wrapper = shallow(React.createElement(ScreenPicker));
            const entireScreenStateMock = {
                sources: [
                    { display_id: '1', id: '1', name: 'Entire screen', thumbnail: undefined },
                    { display_id: '2', id: '2', name: 'Screen 2', thumbnail: undefined },
                    { display_id: '3', id: '3', name: 'screen 3', thumbnail: undefined },
                ],
            };
            wrapper.setState(entireScreenStateMock);
            expect(wrapper.find(screenTabCustomSelector)).toHaveLength(1);
            expect(wrapper.find(applicationTabCustomSelector)).toHaveLength(0);
        });

        it('should show `screen-tab` for Windows when source name is Entire screen and display_id is not present', () => {
            const env = require('../src/common/env');
            const wrapper = shallow(React.createElement(ScreenPicker));
            const entireScreenStateMock = {
                sources: [
                    { display_id: '', id: '1', name: 'Entire screen', thumbnail: undefined },
                    { display_id: '', id: '2', name: 'Screen 2', thumbnail: undefined },
                    { display_id: '', id: '3', name: 'screen 3', thumbnail: undefined },
                ],
            };
            env.isWindowsOS = true;
            env.isLinux = false;
            env.isMac = false;
            wrapper.setState(entireScreenStateMock);
            expect(wrapper.find(screenTabCustomSelector)).toHaveLength(1);
            expect(wrapper.find(applicationTabCustomSelector)).toHaveLength(0);
        });

        it('should not show `screen-tab` for Mac when source name is Entire screen and display_id is not present', () => {
            const env = require('../src/common/env');
            const wrapper = shallow(React.createElement(ScreenPicker));
            const entireScreenStateMock = {
                sources: [
                    { display_id: '', id: '1', name: 'Entire screen', thumbnail: undefined },
                    { display_id: '', id: '2', name: 'Screen 2', thumbnail: undefined },
                    { display_id: '', id: '3', name: 'screen 3', thumbnail: undefined },
                ],
            };
            env.isWindowsOS = false;
            env.isLinux = false;
            env.isMac = true;
            wrapper.setState(entireScreenStateMock);
            expect(wrapper.find(screenTabCustomSelector)).toHaveLength(0);
            expect(wrapper.find(applicationTabCustomSelector)).toHaveLength(1);
        });

        it('should show `screen-tab` and `application-tab` when `isScreensAvailable` and `isApplicationsAvailable` is true', () => {
            const wrapper = shallow(React.createElement(ScreenPicker));
            const customState = {
                sources: [
                    { display_id: '1', id: '1', name: 'Entire screen', thumbnail: undefined },
                    { display_id: '', id: '1', name: 'Application screen', thumbnail: undefined },
                ],
            };
            wrapper.setState(customState);
            expect(wrapper.find(applicationTabCustomSelector)).toHaveLength(1);
            expect(wrapper.find(screenTabCustomSelector)).toHaveLength(1);
        });

        it('should show `error-message` when source is empty', () => {
            const errorSelector = '.error-message';
            const wrapper = shallow(React.createElement(ScreenPicker));
            wrapper.setState({ sources: []});
            expect(wrapper.find(errorSelector)).toHaveLength(1);
        });
    });

    describe('`screen-picker-data` event', () => {
        it('should call `screen-picker-data` when component is mounted', () => {
            const onEventLabel = 'on';
            const spy = jest.spyOn(ipcRenderer, onEventLabel);
            shallow(React.createElement(ScreenPicker));
            expect(spy).lastCalledWith(screenPickerDataLabel, expect.any(Function));
        });

        it('should remove listen `screen-picker-data` when component is unmounted', () => {
            const removeListenerEventLabel = 'removeListener';
            const spy = jest.spyOn(ipcRenderer, removeListenerEventLabel);
            shallow(React.createElement(ScreenPicker)).unmount();
            expect(spy).lastCalledWith(screenPickerDataLabel, expect.any(Function));
        });
    });

    it('should call `ScreenPicker-window-border` event when component is mounted and is WindowsOS', () => {
        const env = require('../src/common/env');
        const spy = jest.spyOn(document.body.classList, 'add');
        const expectedValue = 'ScreenPicker-window-border';
        env.isWindowsOS = true;
        shallow(React.createElement(ScreenPicker));
        expect(spy).toBeCalledWith(expectedValue);
    });
});
