import { shallow } from 'enzyme';
import * as React from 'react';
import ColorPickerPill from '../src/renderer/components/color-picker-pill';

const defaultProps = {
  availableColors: [
    { rgbaColor: 'rgba(0, 142, 255, 0.64)' },
    { rgbaColor: 'rgba(38, 196, 58, 0.64)' },
    { rgbaColor: 'rgba(246, 178, 2, 0.64)' },
    { rgbaColor: 'rgba(233, 0, 0, 0.64)' },
  ],
  onChange: jest.fn(),
};

describe('<ColorPickerPill/>', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<ColorPickerPill {...defaultProps} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should call onChange when clicked on a color dot', () => {
    const wrapper = shallow(<ColorPickerPill {...defaultProps} />);
    wrapper
      .find('[data-testid="colorDot rgba(233, 0, 0, 0.64)"]')
      .simulate('click');
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
  });

  it('should render chosen dots as larger', () => {
    const chosenColorProps = {
      availableColors: [
        { rgbaColor: 'rgba(0, 0, 0, 0.64)', chosen: true },
        { rgbaColor: 'rgba(233, 0, 0, 0.64)' },
      ],
      onChange: jest.fn(),
    };
    const wrapper = shallow(<ColorPickerPill {...chosenColorProps} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render outlined dot if provided in props', () => {
    const outlinedColorProps = {
      availableColors: [
        { rgbaColor: 'rgba(246, 178, 2, 1)' },
        { rgbaColor: 'rgba(255, 255, 255, 1)', outline: 'rgba(0, 0, 0, 1)' },
      ],
      onChange: jest.fn(),
    };
    const wrapper = shallow(<ColorPickerPill {...outlinedColorProps} />);
    expect(wrapper).toMatchSnapshot();
  });
});
