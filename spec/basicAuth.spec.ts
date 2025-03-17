import { ipcRenderer } from 'electron';
import { shallow, ShallowWrapper } from 'enzyme';
import * as React from 'react';
import BasicAuth from '../src/renderer/components/basic-auth';

describe('basic auth', () => {
  const usernameTargetMock: object = {
    target: { id: 'username', value: 'foo' },
  };
  const passwordTargetMock: object = {
    target: { id: 'password', value: '123456' },
  };
  const defaultState: object = {
    hostname: 'unknown',
    isValidCredentials: true,
  };
  const basicAuthMock: object = {
    hostname: 'example',
    isValidCredentials: true,
    password: '123456',
    username: 'foo',
  };
  const usernameMock = { username: 'foo' };
  const passwordMock = { password: '123456' };

  jest.mock('electron', () => ({
    ipcRenderer: {
      send: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      once: jest.fn(),
    },
  }));

  it('should render correctly', () => {
    const wrapper: ShallowWrapper = shallow(React.createElement(BasicAuth));
    expect(wrapper).toMatchSnapshot();
  });

  it('should call `setState` when `change` is called', () => {
    const spy: jest.SpyInstance = jest.spyOn(BasicAuth.prototype, 'setState');
    const wrapper: ShallowWrapper = shallow(React.createElement(BasicAuth));
    wrapper.find('#username').simulate('change', usernameTargetMock);
    expect(spy).lastCalledWith({ ...defaultState, ...usernameMock });
    wrapper.find('#password').simulate('change', passwordTargetMock);
    expect(spy).lastCalledWith({
      ...defaultState,
      ...usernameMock,
      ...passwordMock,
    });
  });

  it('should call submit login', () => {
    const fakeEvent = { preventDefault: () => {} };
    const spy: jest.SpyInstance = jest.spyOn(ipcRenderer, 'send');
    const wrapper: ShallowWrapper = shallow(React.createElement(BasicAuth));
    wrapper.find('#username').simulate('change', usernameTargetMock);
    wrapper.find('#password').simulate('change', passwordTargetMock);
    wrapper.find('#basicAuth').simulate('submit', fakeEvent);
    expect(spy).lastCalledWith('basic-auth-login', {
      ...usernameMock,
      ...passwordMock,
    });
  });

  it('should call `basic-auth-closed` event when cancel button is clicked', () => {
    const spy: jest.SpyInstance = jest.spyOn(ipcRenderer, 'send');
    const wrapper: ShallowWrapper = shallow(React.createElement(BasicAuth));
    wrapper.find('#cancel').simulate('click');
    expect(spy).lastCalledWith('basic-auth-closed', false);
  });

  describe('basic auth mount and unmount event', () => {
    const basicAuthDataLabel: string = 'basic-auth-data';

    it('should call `basic-auth-data` event when component is mounted', () => {
      const spy: jest.SpyInstance = jest.spyOn(ipcRenderer, 'on');
      shallow(React.createElement(BasicAuth));
      expect(spy).toBeCalledWith(basicAuthDataLabel, expect.any(Function));
    });

    it('should remove listen `basic-auth-data` when component is unmounted', () => {
      const spy: jest.SpyInstance = jest.spyOn(ipcRenderer, 'removeListener');
      const wrapper: ShallowWrapper = shallow(React.createElement(BasicAuth));
      wrapper.unmount();
      expect(spy).toBeCalledWith(basicAuthDataLabel, expect.any(Function));
    });

    it('should call `updateState` when component is mounted', () => {
      const spy: jest.SpyInstance = jest.spyOn(BasicAuth.prototype, 'setState');
      shallow(React.createElement(BasicAuth));
      ipcRenderer.send('basic-auth-data', basicAuthMock);
      expect(spy).toBeCalledWith(basicAuthMock);
    });
  });
});
