jest.mock('save-svg-as-png', function () {
  return {
    svgAsPngUri: async function (svg) {
      return Promise.resolve(svg);
    },
  };
});

import { mount, shallow } from 'enzyme';
import * as React from 'react';
import { ScreenSnippetActionTypes } from '../src/app/analytics-handler';
import { ScreenShotAnnotation } from '../src/common/ipcEvent';
import SnippingTool from '../src/renderer/components/snipping-tool';
import { ipcRenderer } from './__mocks__/electron';

const waitForPromisesToResolve = () =>
  new Promise((resolve) => setTimeout(resolve));

describe('Snipping Tool', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const wrapper = shallow(React.createElement(SnippingTool));
    expect(wrapper).toMatchSnapshot();
  });

  it('should set up a "once" listener for snipping-tool-data event on mounting', () => {
    const spy = jest.spyOn(ipcRenderer, 'once');
    mount(React.createElement(SnippingTool));
    expect(spy).toBeCalledWith('snipping-tool-data', expect.any(Function));
  });

  it('should send screenshot_taken BI event on component mount', () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const expectedValue = {
      type: 'screenshot_taken',
      element: 'screen_capture_annotate',
    };
    mount(React.createElement(SnippingTool));
    expect(spy).toBeCalledWith('snippet-analytics-data', expectedValue);
  });

  it('should send capture_sent BI event when clicking done', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const expectedValue = {
      type: ScreenSnippetActionTypes.ANNOTATE_ADD,
      element: 'screen_capture_annotate',
    };
    const wrapper = mount(React.createElement(SnippingTool));
    wrapper.find('[data-testid="done-button"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith('snippet-analytics-data', expectedValue);
  });

  it('should send capture_sent BI event when clicking copy to clipboard', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const expectedValue = {
      type: ScreenSnippetActionTypes.ANNOTATE_COPY,
      element: 'screen_capture_annotate',
    };
    const wrapper = mount(React.createElement(SnippingTool));
    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    wrapper
      .find('[data-testid="snipping-tool_COPY_TO_CLIPBOARD"]')
      .simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith('snippet-analytics-data', expectedValue);
  });

  it('should send capture_sent BI event when clicking save as', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const expectedValue = {
      type: ScreenSnippetActionTypes.ANNOTATE_SAVE_AS,
      element: 'screen_capture_annotate',
    };
    const wrapper = mount(React.createElement(SnippingTool));
    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    wrapper.find('[data-testid="snipping-tool_SAVE_AS"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith('snippet-analytics-data', expectedValue);
  });

  it('should send capture_sent BI event when clicking done', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const expectedValue = {
      type: ScreenSnippetActionTypes.ANNOTATE_CLOSE,
      element: 'screen_capture_annotate',
    };
    const wrapper = mount(React.createElement(SnippingTool));
    wrapper.find('[data-testid="close-button"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith('snippet-analytics-data', expectedValue);
  });

  it('should send annotate_cleared BI event when clicking clear', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const expectedValue = {
      type: 'annotate_cleared',
      element: 'screen_capture_annotate',
    };
    const wrapper = mount(React.createElement(SnippingTool));
    wrapper.find('[data-testid="clear-button"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith('snippet-analytics-data', expectedValue);
  });

  it('should render pen color picker when clicked on pen', () => {
    const wrapper = shallow(React.createElement(SnippingTool));
    wrapper.find('[data-testid="pen-button"]').simulate('click');
    expect(wrapper.find('[data-testid="pen-colorpicker"]').exists()).toBe(true);
  });

  it('should render highlight color picker when clicked on highlight', () => {
    const wrapper = shallow(React.createElement(SnippingTool));
    wrapper.find('[data-testid="highlight-button"]').simulate('click');
    expect(wrapper.find('[data-testid="highlight-colorpicker"]').exists()).toBe(
      true,
    );
  });

  it('should clear all paths when clicked on clear', () => {
    const props = {
      existingPaths: [
        {
          points: [{ x: 0, y: 0 }],
          shouldShow: true,
          strokeWidth: 5,
          color: 'rgba(233, 0, 0, 0.64)',
          key: 'path0',
        },
      ],
    };
    const wrapper = mount(<SnippingTool {...props} />);
    const annotateComponent = wrapper.find(
      '[data-testid="annotate-component"]',
    );
    wrapper.find('[data-testid="clear-button"]').simulate('click');
    wrapper.update();
    expect(annotateComponent.prop('paths')).toEqual([
      {
        color: 'rgba(233, 0, 0, 0.64)',
        key: 'path0',
        points: [{ x: 0, y: 0 }],
        shouldShow: false,
        strokeWidth: 5,
      },
    ]);
  });

  it('should send upload-snippet event with correct data when clicked on done', async () => {
    const spy = jest.spyOn(ipcRenderer, 'send');
    const wrapper = mount(<SnippingTool />);
    wrapper.find('[data-testid="done-button"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith('upload-snippet', {
      mergedImageData: 'MERGE_FAIL',
      screenSnippetPath: '',
    });
  });

  it('should send upload-snippet event with correct data when clicked on copy to clipboard', async () => {
    const wrapper = mount(<SnippingTool />);
    const spy = jest.spyOn(ipcRenderer, 'send');
    jest.spyOn(document, 'getElementById').mockImplementation((selector) => {
      switch (selector) {
        case 'annotate-area':
          return '123';
        default:
          return '';
      }
    });

    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    wrapper
      .find('[data-testid="snipping-tool_COPY_TO_CLIPBOARD"]')
      .simulate('click');

    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith(ScreenShotAnnotation.COPY_TO_CLIPBOARD, {
      clipboard: '123',
    });
  });

  it('should send upload-snippet event with correct data when clicked on save as', async () => {
    const wrapper = mount(<SnippingTool />);
    const spy = jest.spyOn(ipcRenderer, 'send');
    jest.spyOn(document, 'getElementById').mockImplementation((selector) => {
      switch (selector) {
        case 'annotate-area':
          return '123';
        default:
          return '';
      }
    });
    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    wrapper.find('[data-testid="snipping-tool_SAVE_AS"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith(ScreenShotAnnotation.SAVE_AS, {
      clipboard: '123',
    });
  });

  it('should send upload-snippet event with correct data when clicked on close', async () => {
    const wrapper = mount(<SnippingTool />);
    const spy = jest.spyOn(ipcRenderer, 'send');
    wrapper.find('[data-testid="close-button"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(spy).toBeCalledWith(ScreenShotAnnotation.CLOSE);
  });
});
