import { shallow } from 'enzyme';
import * as React from 'react';
import NotificationSettings from '../src/renderer/components/notification-settings';
import { ipcRenderer } from './__mocks__/electron';

describe('Notification Settings', () => {
    const notificationSettingsLabel = 'notification-settings-data';
    const notificationSettingsMock = {
        position: 'upper-right',
        screens: [
            {
                id: '6713899',
            },
            {
                id: '3512909',
            },
        ],
        display: '6713899',
        theme: 'light'
    };
    const onLabelEvent = 'on';
    const sendEvent = 'send';
    const removeListenerLabelEvent = 'removeListener';

    describe('should mount, unmount and render component', () => {
        it('should render the component', () => {
            const wrapper = shallow(React.createElement(NotificationSettings));
            expect(wrapper).toMatchSnapshot();
        });

        it('should call `notification-settings-data` event when component is mounted', () => {
            const spy = jest.spyOn(ipcRenderer, onLabelEvent);
            shallow(React.createElement(NotificationSettings));
            expect(spy).toBeCalledWith(notificationSettingsLabel, expect.any(Function));
        });

        it('should call `updateState` when component is mounted', () => {
            const spy = jest.spyOn(NotificationSettings.prototype, 'setState');
            shallow(React.createElement(NotificationSettings));

            ipcRenderer.send('notification-settings-data', notificationSettingsMock);

            expect(spy).toBeCalledWith(notificationSettingsMock);
        });

        it('should remove listener `notification-settings-data` when component is unmounted', () => {
            const spyMount = jest.spyOn(ipcRenderer, onLabelEvent);
            const spyUnmount = jest.spyOn(ipcRenderer, removeListenerLabelEvent);

            const wrapper = shallow(React.createElement(NotificationSettings));
            expect(spyMount).toBeCalledWith(notificationSettingsLabel, expect.any(Function));

            wrapper.unmount();
            expect(spyUnmount).toBeCalledWith(notificationSettingsLabel, expect.any(Function));
        });
    });

    describe('should select display', () => {
        it('should select display from drop down', () => {
            const notificationSettingsMock = {
                position: 'upper-right',
                screens: [],
                display: '6713899',
            };

            const spy = jest.spyOn(NotificationSettings.prototype, 'setState');
            const selectDisplaySpy = jest.spyOn(NotificationSettings.prototype, 'selectDisplay');

            const wrapper = shallow(React.createElement(NotificationSettings));
            ipcRenderer.send('notification-settings-data', notificationSettingsMock);

            const positionButton = `select.display-selector`;
            const input = wrapper.find(positionButton);

            input.simulate('change', { target: { value: '6713899' } });

            expect(selectDisplaySpy).toBeCalled();
            expect(spy).toBeCalledWith(notificationSettingsMock);
        });

    });

    describe('should set display position', () => {
        it('should select top right position', () => {
            const notificationSettingsMock = {
                position: 'upper-right',
                screens: [],
                display: '6713899',
                theme: 'light',
            };

            const spy = jest.spyOn(NotificationSettings.prototype, 'setState');
            const togglePositionButtonSpy = jest.spyOn(NotificationSettings.prototype, 'togglePosition');

            const wrapper = shallow(React.createElement(NotificationSettings));
            ipcRenderer.send('notification-settings-data', notificationSettingsMock);

            const input = wrapper.find('[data-testid="upper-right"]');

            input.simulate('click', { target: { value: 'upper-right' } });

            expect(togglePositionButtonSpy).toBeCalled();
            expect(spy).toBeCalledWith(notificationSettingsMock);
        });

        it('should select bottom right position', () => {
            const notificationSettingsMock = {
                position: 'bottom-right',
                screens: [],
                display: '6713899',
            };

            const spy = jest.spyOn(NotificationSettings.prototype, 'setState');
            const togglePositionButtonSpy = jest.spyOn(NotificationSettings.prototype, 'togglePosition');

            const wrapper = shallow(React.createElement(NotificationSettings));
            ipcRenderer.send('notification-settings-data', notificationSettingsMock);

            const input = wrapper.find('[data-testid="lower-right"]');

            input.simulate('click', { target: { value: 'lower-right' } });

            expect(togglePositionButtonSpy).toBeCalled();
            expect(spy).toBeCalledWith(notificationSettingsMock);
        });

        it('should select top left position', () => {
            const notificationSettingsMock = {
                position: 'upper-left',
                screens: [],
                display: '6713899',
            };

            const spy = jest.spyOn(NotificationSettings.prototype, 'setState');
            const togglePositionButtonSpy = jest.spyOn(NotificationSettings.prototype, 'togglePosition');

            const wrapper = shallow(React.createElement(NotificationSettings));
            ipcRenderer.send('notification-settings-data', notificationSettingsMock);

            const input = wrapper.find('[data-testid="upper-left"]');

            input.simulate('click', { target: { value: 'upper-left' } });

            expect(togglePositionButtonSpy).toBeCalled();
            expect(spy).toBeCalledWith(notificationSettingsMock);
        });

        it('should select bottom left position', () => {
            const notificationSettingsMock = {
                position: 'lower-left',
                screens: [],
                display: '6713899',
            };

            const spy = jest.spyOn(NotificationSettings.prototype, 'setState');
            const togglePositionButtonSpy = jest.spyOn(NotificationSettings.prototype, 'togglePosition');

            const wrapper = shallow(React.createElement(NotificationSettings));
            ipcRenderer.send('notification-settings-data', notificationSettingsMock);

            const input = wrapper.find('[data-testid="lower-left"]');

            input.simulate('click', { target: { value: 'lower-left' } });

            expect(togglePositionButtonSpy).toBeCalled();
            expect(spy).toBeCalledWith(notificationSettingsMock);
        });
    });

    describe('should submit or cancel new preferences', () => {
        it('should close window on pressing cancel button', () => {
            const notificationSettingsMock = {
                position: 'lower-left',
                screens: [],
                display: '6713899',
            };

            const spy = jest.spyOn(ipcRenderer, sendEvent);
            const closeButtonSpy = jest.spyOn(NotificationSettings.prototype, 'close');

            const wrapper = shallow(React.createElement(NotificationSettings));
            ipcRenderer.send('notification-settings-data', notificationSettingsMock);

            const closeButton = `button.footer-button-dismiss`;
            const input = wrapper.find(closeButton);

            input.simulate('click');

            expect(closeButtonSpy).toBeCalled();
            expect(spy).toBeCalledWith('symphony-api', {
                cmd: 'close-window',
                windowType: 'notification-settings',
            });
        });

        it('should submit new preferences on pressing ok button', () => {
            const notificationSettingsMock = {
                position: 'lower-left',
                screens: [],
                display: '6713899',
            };

            const spy = jest.spyOn(ipcRenderer, sendEvent);
            const closeButtonSpy = jest.spyOn(NotificationSettings.prototype, 'close');

            const wrapper = shallow(React.createElement(NotificationSettings));
            ipcRenderer.send('notification-settings-data', notificationSettingsMock);

            const closeButton = `button.footer-button-ok`;
            const input = wrapper.find(closeButton);

            input.simulate('click');

            expect(closeButtonSpy).toBeCalled();
            expect(spy).toBeCalledWith('notification-settings-update', {
                position: 'lower-left',
                display: '6713899',
            });
        });
    });

});
