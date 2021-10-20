import { shallow } from 'enzyme';
import * as React from 'react';
import { apiCmds } from '../src/common/api-interface';
import WindowsTitleBar from '../src/renderer/components/windows-title-bar';
import { ipcRenderer } from './__mocks__/electron';

// @ts-ignore
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

// TODO: Fix tests
describe('windows title bar', () => {
  const onEventLabel = 'on';
  const sendEventLabel = 'send';
  const apiName = 'symphony-api';
  const maximizeEventLabel = 'maximize';
  const unmaximizeEventLabel = 'unmaximize';
  const enterFullScreenEventLabel = 'enter-full-screen';
  const leaveFullScreenEventLabel = 'leave-full-screen';

  it('should render correctly', () => {
    const wrapper = shallow(React.createElement(WindowsTitleBar));
    expect(wrapper).toMatchSnapshot();
  });

  it('should mount correctly', () => {
    const spy = jest.spyOn(ipcRenderer, onEventLabel);
    const wrapper = shallow(React.createElement(WindowsTitleBar));
    const instance: any = wrapper.instance();
    instance.updateState({ isMaximized: false });
    expect(spy).toBeCalled();
    expect(spy).nthCalledWith(1, maximizeEventLabel, expect.any(Function));
    expect(spy).nthCalledWith(2, unmaximizeEventLabel, expect.any(Function));
    expect(spy).nthCalledWith(
      3,
      enterFullScreenEventLabel,
      expect.any(Function),
    );
    expect(spy).nthCalledWith(
      4,
      leaveFullScreenEventLabel,
      expect.any(Function),
    );
  });

  it('should call `close` correctly', () => {
    const titleLabel = 'Close';
    const wrapper = shallow(React.createElement(WindowsTitleBar));
    const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
    const cmd = {
      cmd: apiCmds.closeMainWindow,
    };
    const spy = jest.spyOn(ipcRenderer, sendEventLabel);
    wrapper.find(customSelector).simulate('click');
    expect(spy).toBeCalledWith(apiName, cmd);
  });

  it('should call `minimize` correctly', () => {
    const titleLabel = 'Minimize';
    const wrapper = shallow(React.createElement(WindowsTitleBar));
    const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
    const spy = jest.spyOn(ipcRenderer, sendEventLabel);
    const cmd = {
      cmd: apiCmds.minimizeMainWindow,
    };
    wrapper.find(customSelector).simulate('click');
    expect(spy).toBeCalledWith(apiName, cmd);
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
    };
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

  describe('maximize functions', () => {
    it('should call `unmaximize` correctly when is not full screen', () => {
      const titleLabel = 'Restore';
      const cmd = {
        cmd: apiCmds.unmaximizeMainWindow,
      };
      const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
      const wrapper = shallow(React.createElement(WindowsTitleBar));
      const spy = jest.spyOn(ipcRenderer, sendEventLabel);
      wrapper.setState({ isMaximized: true });
      wrapper.find(customSelector).simulate('click');
      expect(spy).toBeCalledWith(apiName, cmd);
    });

    it('should call `unmaximize` correctly when is full screen', () => {
      const titleLabel = 'Restore';
      const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
      const wrapper = shallow(React.createElement(WindowsTitleBar));
      const cmd = {
        cmd: apiCmds.unmaximizeMainWindow,
      };
      const spy = jest.spyOn(ipcRenderer, sendEventLabel);
      wrapper.setState({ isMaximized: true });
      wrapper.find(customSelector).simulate('click');
      expect(spy).toBeCalledWith(apiName, cmd);
    });

    it('should call maximize correctly when it is not in full screen', () => {
      const titleLabel = 'Maximize';
      const expectedState = { isMaximized: true };
      const customSelector = `button.title-bar-button[title="${titleLabel}"]`;
      const wrapper = shallow(React.createElement(WindowsTitleBar));
      wrapper.setState({ isMaximized: false });
      const spy = jest.spyOn(ipcRenderer, sendEventLabel);
      const spyState = jest.spyOn(wrapper, 'setState');
      wrapper.find(customSelector).simulate('click');
      const cmd = {
        cmd: apiCmds.maximizeMainWindow,
      };
      expect(spy).toBeCalled();
      expect(spy).toBeCalledWith(apiName, cmd);
      expect(spyState).lastCalledWith(expectedState);
    });
  });
});
