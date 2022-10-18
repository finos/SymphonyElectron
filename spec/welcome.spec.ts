import { shallow } from 'enzyme';
import * as React from 'react';
import Welcome from '../src/renderer/components/welcome';
import { ipcRenderer } from './__mocks__/electron';

describe('welcome', () => {
  const welcomeLabel = 'welcome';
  const welcomeMock = {
    url: 'https://my.symphony.com',
    message: '',
    urlValid: true,
    isPodConfigured: false,
    isSeamlessLoginEnabled: true,
  };
  const onLabelEvent = 'on';
  const removeListenerLabelEvent = 'removeListener';

  it('should render correctly', () => {
    const wrapper = shallow(React.createElement(Welcome));
    expect(wrapper).toMatchSnapshot();
  });

  it('should call `welcome` event when component is mounted', () => {
    const spy = jest.spyOn(ipcRenderer, onLabelEvent);
    shallow(React.createElement(Welcome));
    expect(spy).toBeCalledWith(welcomeLabel, expect.any(Function));
  });

  it('should remove listener `welcome` when component is unmounted', () => {
    const spyMount = jest.spyOn(ipcRenderer, onLabelEvent);
    const spyUnmount = jest.spyOn(ipcRenderer, removeListenerLabelEvent);

    const wrapper = shallow(React.createElement(Welcome));
    expect(spyMount).toBeCalledWith(welcomeLabel, expect.any(Function));

    wrapper.unmount();
    expect(spyUnmount).toBeCalledWith(welcomeLabel, expect.any(Function));
  });

  it('should call `updateState` when component is mounted', () => {
    const spy = jest.spyOn(Welcome.prototype, 'setState');
    shallow(React.createElement(Welcome));

    ipcRenderer.send('welcome', welcomeMock);

    expect(spy).toBeCalledWith(welcomeMock);
  });

  it('should change pod url in text box', () => {
    const podUrlMock = {
      url: 'https://corporate.symphony.com',
      message: '',
      urlValid: true,
    };

    const spy = jest.spyOn(Welcome.prototype, 'setState');
    const updatePodUrlSpy = jest.spyOn(Welcome.prototype, 'updatePodUrl');

    const wrapper = shallow(React.createElement(Welcome));
    ipcRenderer.send('welcome', welcomeMock);

    const welcomePodUrlBox = `input.Welcome-main-container-podurl-box`;
    const input = wrapper.find(welcomePodUrlBox);

    input.simulate('focus');
    input.simulate('change', {
      target: { value: 'https://corporate.symphony.com' },
    });

    expect(updatePodUrlSpy).toBeCalled();
    expect(spy).toBeCalledWith(podUrlMock);
  });

  it('should show message for invalid pod url', () => {
    const podUrlMock = {
      url: 'abcdef',
      message: 'Please enter a valid url',
      urlValid: false,
    };

    const spy = jest.spyOn(Welcome.prototype, 'setState');
    const updatePodUrlSpy = jest.spyOn(Welcome.prototype, 'updatePodUrl');

    const wrapper = shallow(React.createElement(Welcome));
    ipcRenderer.send('welcome', welcomeMock);

    const welcomePodUrlBox = `input.Welcome-main-container-podurl-box`;
    const input = wrapper.find(welcomePodUrlBox);

    input.simulate('focus');
    input.simulate('change', { target: { value: 'abcdef' } });

    expect(updatePodUrlSpy).toBeCalled();
    expect(spy).toBeCalledWith(podUrlMock);
  });

  it('should set pod url', () => {
    const spy = jest.spyOn(Welcome.prototype, 'setState');
    const setPodUrlSpy = jest.spyOn(Welcome.prototype, 'login');

    const wrapper = shallow(React.createElement(Welcome));
    ipcRenderer.send('welcome', welcomeMock);
    const welcomeContinueButton = `button.Welcome-continue-button`;
    wrapper.find(welcomeContinueButton).simulate('click');

    expect(setPodUrlSpy).toBeCalled();
    expect(spy).toBeCalledWith(welcomeMock);
  });

  it('should not show pod url input field', () => {
    const welcomeMock = {
      url: 'https://my.symphony.com',
      message: '',
      urlValid: true,
      isPodConfigured: true,
      isSeamlessLoginEnabled: true,
    };
    const wrapper = shallow(React.createElement(Welcome));
    ipcRenderer.send('welcome', welcomeMock);
    const podUrlBox = `input.Welcome-main-container-podurl-box`;
    expect(wrapper.find(podUrlBox).getElements()).toEqual([]);
  });
});
