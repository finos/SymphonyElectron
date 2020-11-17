import { shallow } from 'enzyme';
import * as React from 'react';
import SnippingTool from '../src/renderer/components/snipping-tool';
import { ipcRenderer } from './__mocks__/electron';

describe('Snipping Tool', () => {
  const snippingToolLabel = 'snipping-tool-data';
  const onLabelEvent = 'on';

  it('should render correctly', () => {
    const wrapper = shallow(React.createElement(SnippingTool));
    expect(wrapper).toMatchSnapshot();
  });

  it('should call `snipping-tool-data` event when component is mounted', () => {
    const spy = jest.spyOn(ipcRenderer, onLabelEvent);
    shallow(React.createElement(SnippingTool));
    expect(spy).toBeCalledWith(snippingToolLabel, expect.any(Function));
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
});
