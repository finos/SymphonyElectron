import { shallow } from 'enzyme';
import * as React from 'react';
import NotificationComp from '../src/renderer/components/notification-comp';
import { Themes } from '../src/renderer/components/notification-settings';
import { ipcRenderer } from './__mocks__/electron';

const IPC_RENDERER_NOTIFICATION_DATA_CHANNEL = 'notification-data';
describe('Toast notification component', () => {
  const defaultProps = {
    title: 'Oompa Loompa',
  };
  const spy = jest.spyOn(NotificationComp.prototype, 'setState');
  let wrapper;
  beforeEach(() => {
    wrapper = shallow(React.createElement(NotificationComp));
  });

  it('should render correctly', () => {
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, defaultProps);
    expect(spy).toBeCalledWith(defaultProps);
    const container = wrapper.find('.title');
    expect(container.text()).toBe(defaultProps.title);
  });

  it('should close the notification when the close button is clicked', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const closeButton = wrapper.find('.close-button img');
    expect(closeButton).toBeTruthy();
    closeButton.simulate('click', { stopPropagation: jest.fn() });
    expect(spy).toBeCalledWith('close-notification', 0);
  });

  it('should click on the notification when the user clicks on main container', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const notificationContainer = wrapper.find('.main-container');
    expect(notificationContainer).toBeTruthy();
    notificationContainer.simulate('click', { stopPropagation: jest.fn() });
    expect(spy).toBeCalledWith('notification-clicked', 0);
  });

  it('should render Symphony logo if no image provided', () => {
    const logo = '';
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      logo,
    });
    const defaultLogoContainer = wrapper.find('.default-logo');
    expect(defaultLogoContainer).toBeTruthy();
    const imageContainer = wrapper.find('.profile-picture');
    expect(imageContainer.exists()).toBeFalsy();
  });

  it('should render Symphony logo if no icon sent - Client 1.5 settings use-case with "See sample" ', () => {
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
    });
    const defaultLogoContainer = wrapper.find('.default-logo');
    expect(defaultLogoContainer).toBeTruthy();
    const imageContainer = wrapper.find('.profile-picture');
    expect(imageContainer.exists()).toBeFalsy();
  });

  it('should render Symphony logo if Symphony default image provided', () => {
    const logo = './default.png';
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      logo,
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

  it('should flash as a mention when mention sent', () => {
    const theme = Themes.DARK;
    const flash = true;
    const hasMention = true;
    const themedMentionFlashing = `.${theme}-mention-flashing`;
    let themedToastNotification = wrapper.find(themedMentionFlashing);
    expect(themedToastNotification.exists()).toBeFalsy();
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      hasMention,
      theme,
      flash,
    });
    themedToastNotification = wrapper.find(themedMentionFlashing);
    expect(themedToastNotification.exists()).toBeTruthy();
  });

  it('should flash as mention even if it is a message from an external user', () => {
    const theme = Themes.DARK;
    const isExternal = true;
    const hasMention = true;
    const flash = true;
    const themedMentionFlashing = `.${theme}-ext-mention-flashing`;
    let themedToastNotification = wrapper.find(themedMentionFlashing);
    expect(themedToastNotification.exists()).toBeFalsy();
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      hasMention,
      theme,
      isExternal,
      flash,
    });
    themedToastNotification = wrapper.find(themedMentionFlashing);
    expect(themedToastNotification.exists()).toBeTruthy();
  });

  it('should display reply button when requested', () => {
    const hasReply = true;
    const replyButtonSelector = `.action-button`;
    let toastNotificationReplyButton = wrapper.find(replyButtonSelector);
    expect(toastNotificationReplyButton.exists()).toBeFalsy();
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      hasReply,
    });
    toastNotificationReplyButton = wrapper.find(replyButtonSelector);
    expect(toastNotificationReplyButton.exists()).toBeTruthy();
  });

  it('should display ignore button when requested', () => {
    const hasIgnore = true;
    const ignoreButtonSelector = `.action-button`;
    let toastNotificationIgnoreButton = wrapper.find(ignoreButtonSelector);
    expect(toastNotificationIgnoreButton.exists()).toBeFalsy();
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      hasIgnore,
    });
    toastNotificationIgnoreButton = wrapper.find(ignoreButtonSelector);
    expect(toastNotificationIgnoreButton.exists()).toBeTruthy();
  });

  it('should trigger mouse hovering function while hovering a notification', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const notificationContainer = wrapper.find(
      '[data-testid="NOTIFICATION_CONTAINER"]',
    );
    expect(notificationContainer).toBeTruthy();
    notificationContainer.simulate('mouseenter');
    expect(spy).toBeCalledWith('notification-mouseenter', 0);
  });

  it('should display the updated badge when message is an update', async () => {
    let updatedBadge = wrapper.find('.updated-badge');
    expect(updatedBadge.exists()).toBeFalsy();
    const isUpdated = true;
    ipcRenderer.send(IPC_RENDERER_NOTIFICATION_DATA_CHANNEL, {
      ...defaultProps,
      isUpdated,
    });

    updatedBadge = wrapper.find('.updated-badge');
    expect(updatedBadge.exists()).toBeTruthy();
  });
});
