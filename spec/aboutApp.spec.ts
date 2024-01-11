import { shallow } from 'enzyme';
import * as React from 'react';
import { apiCmds } from '../src/common/api-interface';
import AboutApp from '../src/renderer/components/about-app';
import { ipcRenderer } from './__mocks__/electron';

describe('about app', () => {
  const aboutAppDataLabel = 'about-app-data';
  const aboutDataMockClipboard = {
    sbeVersion: '1',
    userConfig: {},
    globalConfig: { isPodUrlEditable: true },
    cloudConfig: {},
    finalConfig: { url: 'abcxyz.symphony.com' },
    appName: 'Symphony',
    versionLocalised: 'Version',
    buildNumber: '4.x.x',
    hostname: 'abcxyz.symphony.com',
    sfeVersion: 'N/A',
    sfeClientType: '1.5',
    sdaVersion: '3.8.0',
    sdaBuildNumber: '0',
    electronVersion: '3.1.11',
    chromeVersion: '66.789',
    v8Version: '6.7.8',
    nodeVersion: '10.12',
    openSslVersion: '1.2.3',
    zlibVersion: '4.5.6',
    uvVersion: '7.8',
    aresVersion: '9.10',
    httpParserVersion: '11.12',
    swiftSearchVersion: '1.55.3-beta.1',
    swiftSearchSupportedVersion: 'N/A',
  };
  const aboutDataMockState = {
    ...aboutDataMockClipboard,
    updatedHostname: 'abcxyz.symphony.com',
  };
  const onLabelEvent = 'on';
  const ipcSendEvent = 'send';
  const removeListenerLabelEvent = 'removeListener';

  it('should render correctly', () => {
    const wrapper = shallow(React.createElement(AboutApp));
    expect(wrapper).toMatchSnapshot();
  });

  it('should call `about-app-data` event when component is mounted', () => {
    const spy = jest.spyOn(ipcRenderer, onLabelEvent);
    shallow(React.createElement(AboutApp));
    expect(spy).toBeCalledWith(aboutAppDataLabel, expect.any(Function));
  });

  it('should remove listener `about-app-data` when component is unmounted', () => {
    const spyMount = jest.spyOn(ipcRenderer, onLabelEvent);
    const spyUnmount = jest.spyOn(ipcRenderer, removeListenerLabelEvent);
    const wrapper = shallow(React.createElement(AboutApp));
    expect(spyMount).toBeCalledWith(aboutAppDataLabel, expect.any(Function));
    wrapper.unmount();
    expect(spyUnmount).toBeCalledWith(aboutAppDataLabel, expect.any(Function));
  });

  it('should call `updateState` when component is mounted', () => {
    const spy = jest.spyOn(AboutApp.prototype, 'setState');
    shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', aboutDataMockState);
    expect(spy).toBeCalledWith(aboutDataMockState);
  });

  it('should copy the correct data on to clipboard', () => {
    const spyIpc = jest.spyOn(ipcRenderer, ipcSendEvent);
    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', aboutDataMockClipboard);
    const copyButtonSelector = `[data-testid="COPY_BUTTON"]`;
    wrapper.find(copyButtonSelector).simulate('click');
    const expectedData = {
      cmd: apiCmds.aboutAppClipBoardData,
      clipboard: aboutDataMockClipboard,
      clipboardType: 'clipboard',
    };
    expect(spyIpc).toBeCalledWith('symphony-api', expectedData);
  });

  it('should display input when triple clicked on pod', () => {
    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', aboutDataMockState);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });
    const podInput = wrapper.find('.AboutApp-pod-input');
    expect(podInput.exists()).toEqual(true);
  });

  it('should not display input when triple clicked on pod', () => {
    const cloneAboutDataMock = aboutDataMockState;

    cloneAboutDataMock.globalConfig = { isPodUrlEditable: false };
    cloneAboutDataMock.userConfig = { isPodUrlEditable: true };

    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', cloneAboutDataMock);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });
    const podInput = wrapper.find('.AboutApp-pod-input');
    expect(podInput.exists()).toEqual(false);
  });

  it('should not display config based on global config only', () => {
    const cloneAboutDataMock = aboutDataMockState;

    cloneAboutDataMock.globalConfig = { isPodUrlEditable: false };
    cloneAboutDataMock.userConfig = { isPodUrlEditable: false };

    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', cloneAboutDataMock);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });
    const podInput = wrapper.find('.AboutApp-pod-input');
    expect(podInput.exists()).toEqual(false);
  });

  it('should display config based on global config only', () => {
    const cloneAboutDataMock = aboutDataMockState;

    cloneAboutDataMock.globalConfig = { isPodUrlEditable: true };
    cloneAboutDataMock.userConfig = { isPodUrlEditable: false };

    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', cloneAboutDataMock);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });
    const podInput = wrapper.find('.AboutApp-pod-input');
    expect(podInput.exists()).toEqual(true);
  });

  it('should display cancel button on triple click and behave correctly', () => {
    const cloneAboutDataMock = aboutDataMockState;

    cloneAboutDataMock.globalConfig = { isPodUrlEditable: true };
    cloneAboutDataMock.userConfig = { isPodUrlEditable: false };

    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', cloneAboutDataMock);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });
    const podInput = wrapper.find('[data-testid="CANCEL_BUTTON"]');
    podInput.simulate('mousedown');
    expect(wrapper.find(`[data-testid="POD_INFO"]`).exists()).toEqual(true);
  });

  it('should shrink text if its save and close', () => {
    const cloneAboutDataMock = {
      ...aboutDataMockState,
      finalConfig: { url: 'bcd.symphony.com' },
    };

    cloneAboutDataMock.globalConfig = { isPodUrlEditable: true };
    cloneAboutDataMock.userConfig = { isPodUrlEditable: false };

    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', cloneAboutDataMock);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });

    const inputPod = wrapper.find(`[data-testid="POD_INFO_INPUT"]`);
    inputPod.simulate('keydown', {
      target: { value: 'pod.symphony.com' },
      keyCode: 13,
    });
    expect(
      wrapper
        .find(`[data-testid="CLOSE_BUTTON"] span`)
        .hasClass('AboutApp-button-save-restart-text'),
    ).toBe(true);
  });

  it('should restore to global config url on cancelling after enter pressed', () => {
    const cloneAboutDataMock = {
      ...aboutDataMockState,
      finalConfig: { url: 'bcd.symphony.com' },
    };

    cloneAboutDataMock.globalConfig = { isPodUrlEditable: true };
    cloneAboutDataMock.userConfig = { isPodUrlEditable: false };

    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', cloneAboutDataMock);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });

    const inputPod = wrapper.find(`[data-testid="POD_INFO_INPUT"]`);
    inputPod.simulate('change', {
      target: { value: 'pod.symphony.com123' },
    });
    inputPod.simulate('keydown', {
      target: { value: 'pod.symphony.com123' },
      keyCode: 13,
    });
    wrapper.find(`[data-testid="CANCEL_BUTTON"]`).simulate('click');

    expect(pod.text()).toBe('abcxyz.symphony.com');
  });

  it('should work with A11Y Cancel button', () => {
    const cloneAboutDataMock = {
      ...aboutDataMockState,
      finalConfig: { url: 'bcd.symphony.com' },
    };

    cloneAboutDataMock.globalConfig = { isPodUrlEditable: true };
    cloneAboutDataMock.userConfig = { isPodUrlEditable: false };

    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', cloneAboutDataMock);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });

    wrapper.find(`[data-testid="CANCEL_BUTTON"]`).simulate('keydown', {
      target: { value: 'pod.symphony.com123' },
      keyCode: 13,
    });

    expect(wrapper.find(`[data-testid="CANCEL_BUTTON"]`).exists()).toBe(false);
  });

  it('should work with A11Y Close button', () => {
    const cloneAboutDataMock = {
      ...aboutDataMockState,
      finalConfig: { url: 'bcd.symphony.com' },
    };

    cloneAboutDataMock.globalConfig = { isPodUrlEditable: true };
    cloneAboutDataMock.userConfig = { isPodUrlEditable: false };

    const wrapper = shallow(React.createElement(AboutApp));
    ipcRenderer.send('about-app-data', cloneAboutDataMock);
    const pod = wrapper.find(`[data-testid="POD_INFO"]`);
    pod.simulate('click', { detail: 1 });
    pod.simulate('click', { detail: 2 });
    pod.simulate('click', { detail: 3 });

    const inputPod = wrapper.find(`[data-testid="POD_INFO_INPUT"]`);
    inputPod.simulate('change', {
      target: { value: 'pod.symphony.com' },
    });
    inputPod.simulate('keydown', {
      target: { value: 'pod.symphony.com' },
      keyCode: 13,
    });

    wrapper.find(`[data-testid="CLOSE_BUTTON"]`).simulate('keydown', {
      keyCode: 13,
    });

    expect(ipcRenderer.send).toHaveBeenNthCalledWith(
      12,
      'user-pod-updated',
      'pod.symphony.com',
    );
  });
});
