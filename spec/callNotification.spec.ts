import { shallow } from 'enzyme';
import * as React from 'react';
import CallNotificationComp from '../src/renderer/components/call-notification';
import { Themes } from '../src/renderer/components/notification-settings';
import { ipcRenderer } from './__mocks__/electron';

const IPC_RENDERER_NOTIFICATION_DATA_CHANNEL = 'call-notification-data';
describe('Call toast notification component', () => {
  const defaultProps = {
    title: 'Incoming call',
  };
  const spy = jest.spyOn(CallNotificationComp.prototype, 'setState');
  let wrapper;
  beforeEach(() => {
    wrapper = shallow(React.createElement(CallNotificationComp));
  });

  it('should render correctly', () => {
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, defaultProps);
    expect(spy).toBeCalledWith(defaultProps);
    const container = wrapper.find('.title');
    expect(container.text()).toBe(defaultProps.title);
  });

  it('should close the call notification when the reject button is clicked', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const rejectButton = wrapper.find(
      '[data-testid="CALL_NOTIFICATION_REJECT_BUTTON"]',
    );
    expect(rejectButton).toBeTruthy();
    rejectButton.simulate('click', { stopPropagation: jest.fn() });
    expect(spy).toBeCalledWith('call-notification-on-reject', 0);
  });

  it('should close the call notification when the accept button is clicked', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const rejectButton = wrapper.find(
      '[data-testid="CALL_NOTIFICATION_ACCEPT_BUTTON"]',
    );
    expect(rejectButton).toBeTruthy();
    rejectButton.simulate('click', { stopPropagation: jest.fn() });
    expect(spy).toBeCalledWith('call-notification-on-reject', 0);
    expect(spy).toBeCalledWith('call-notification-on-accept', 0);
  });

  it('should click on the notification when the user clicks on main container', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const notificationContainer = wrapper.find('.container');
    expect(notificationContainer).toBeTruthy();
    notificationContainer.simulate('click', { stopPropagation: jest.fn() });
    expect(spy).toBeCalledWith('call-notification-clicked', 0);
  });

  it('should render Symphony logo with IM chat type if no image provided', () => {
    const icon = '';
    const profilePlaceHolderText = 'LS';
    const callType = 'IM';
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      icon,
      profilePlaceHolderText,
      callType,
    });
    const defaultLogoContainer = wrapper.find('.thumbnail');
    expect(defaultLogoContainer).toBeTruthy();
    const imageContainer = wrapper.find('.profilePlaceHolderText');
    expect(imageContainer.exists()).toBeTruthy();
    const imClass = wrapper.find('.profilePlaceHolderContainer');
    expect(imClass.exists()).toBeTruthy();
  });

  it('should render correct button text', () => {
    const acceptButtonText = 'Answer';
    const rejectButtonText = 'Decline';
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      acceptButtonText,
      rejectButtonText,
    });
    const acceptButton = wrapper.find(
      '[data-testid="CALL_NOTIFICATION_ACCEPT_BUTTON"]',
    );
    expect(acceptButton.text()).toBe('Answer');
    const rejectButton = wrapper.find(
      '[data-testid="CALL_NOTIFICATION_REJECT_BUTTON"]',
    );
    expect(rejectButton.text()).toBe('Decline');
  });

  it('should render default primary text as unknown when empty', () => {
    const icon = '';
    const profilePlaceHolderText = 'LS';
    const callType = 'IM';
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      icon,
      profilePlaceHolderText,
      callType,
    });
    const callerName = wrapper.find('.caller-name');
    expect(callerName.text()).toBe('unknown');
  });

  it('should render Symphony logo with ROOM chat type if no image provided', () => {
    const icon = '';
    const profilePlaceHolderText = 'LS';
    const callType = 'ROOM';
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      icon,
      profilePlaceHolderText,
      callType,
    });
    const defaultLogoContainer = wrapper.find('.thumbnail');
    expect(defaultLogoContainer).toBeTruthy();
    const imageContainer = wrapper.find('.profilePlaceHolderText');
    expect(imageContainer.exists()).toBeTruthy();
    const imClass = wrapper.find('.roomPlaceHolderContainer');
    expect(imClass.exists()).toBeTruthy();
  });

  it('should render Symphony logo if Symphony default image provided', () => {
    const icon = './default.png';
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      icon,
    });
    const defaultLogoContainer = wrapper.find('.default-logo');
    expect(defaultLogoContainer).toBeTruthy();
    const imageContainer = wrapper.find('.profile-picture');
    expect(imageContainer.exists()).toBeFalsy();
  });

  it('should flash in a custom way when theme is set', () => {
    const flash = true;
    const theme = Themes.DARK;
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      flash,
      theme,
    });
    const flashingNotification = wrapper.find(`.${theme}-flashing`);
    expect(flashingNotification.exists()).toBeTruthy();
  });

  it('should display ext badge when external', () => {
    let externalBadge = wrapper.find('.ext-badge-container');
    expect(externalBadge.exists()).toBeFalsy();
    const isExternal = true;
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      isExternal,
    });
    externalBadge = wrapper.find('.ext-badge-container');
    expect(externalBadge.exists()).toBeTruthy();
  });
});
