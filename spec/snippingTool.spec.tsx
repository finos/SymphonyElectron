import { mount, shallow } from 'enzyme';
import * as React from 'react';
import SnippingTool from '../src/renderer/components/snipping-tool';
import * as analyticsHandler from './../src/app/analytics-handler';
import { ipcRenderer } from './__mocks__/electron';

const waitForPromisesToResolve = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  jest.clearAllMocks();
});

describe('Snipping Tool', () => {
  it('should render correctly', () => {
    const wrapper = shallow(React.createElement(SnippingTool));
    expect(wrapper).toMatchSnapshot();
  });

  it('should set up a "once" listener for snipping-tool-data event on mounting', () => {
    const spy = jest.spyOn(ipcRenderer, 'once');
    mount(React.createElement(SnippingTool));
    expect(spy).toBeCalledWith('snipping-tool-data', expect.any(Function));
  });

  it('should send capture_taken BI event on component mount', () => {
    const spy = jest.spyOn(analyticsHandler.analytics, 'track');
    const expectedValue = { action_type: 'capture_taken', element: 'ScreenSnippet' };
    mount(React.createElement(SnippingTool));
    expect(spy).toBeCalledWith(expectedValue);
  });

  it('should send capture_sent BI event when clicking done', async () => {
    const spy = jest.spyOn(analyticsHandler.analytics, 'track');
    const expectedValue = { action_type: 'capture_sent', element: 'ScreenSnippet' };
    const wrapper = mount(React.createElement(SnippingTool));
    wrapper.find('[data-testid="done-button"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith(expectedValue);
  });

  it('should render pen color picker when clicked on pen', () => {
    const wrapper = shallow(React.createElement(SnippingTool));
    wrapper.find('[data-testid="pen-button"]').simulate('click');
    expect(wrapper.find('[data-testid="pen-colorpicker"]').exists()).toBe(true);
  });

  it('should render highlight color picker when clicked on highlight', () => {
    const wrapper = shallow(React.createElement(SnippingTool));
    wrapper.find('[data-testid="highlight-button"]').simulate('click');
    expect(wrapper.find('[data-testid="highlight-colorpicker"]').exists()).toBe(true);
  });

  it('should clear all paths when clicked on clear', () => {
    const props = {
      existingPaths: [{
        points: [{ x: 0, y: 0 }],
        shouldShow: true,
        strokeWidth: 5,
        color: 'rgba(233, 0, 0, 0.64)',
        key: 'path0',
      }],
    };
    const wrapper = mount(<SnippingTool {...props} />);
    const annotateComponent = wrapper.find('[data-testid="annotate-component"]');
    wrapper.find('[data-testid="clear-button"]').simulate('click');
    wrapper.update();
    expect(annotateComponent.prop('paths')).toEqual(
      [{
        color: 'rgba(233, 0, 0, 0.64)',
        key: 'path0',
        points: [{ x: 0, y: 0 }],
        shouldShow: false,
        strokeWidth: 5,
      }]);
  });

  it('should send upload-snippet event with correct data when clicked on done', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const wrapper = mount(<SnippingTool />);
    wrapper.find('[data-testid="done-button"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith('upload-snippet', {
      base64PngData: 'NO CANVAS',
      screenSnippetPath: '',
    });
  });
});
