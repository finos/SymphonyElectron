import { mount } from 'enzyme';
import * as React from 'react';
import AnnotateArea from '../src/renderer/components/annotate-area';
import { Tool } from '../src/renderer/components/snipping-tool';

const defaultProps = {
    paths: [],
    highlightColor: 'rgba(233, 0, 0, 0.64)',
    penColor: 'rgba(38, 196, 58, 1)',
    onChange: jest.fn(),
    imageDimensions: { width: 800, height: 800 },
    annotateAreaDimensions: { width: 800, height: 800 },
    chosenTool: Tool.pen,
    screenSnippetPath: 'very-nice-path',
};

afterEach(() => {
    jest.clearAllMocks();
});

describe('<AnnotateArea/>', () => {
    it('should render correctly', () => {
        const wrapper = mount(<AnnotateArea {...defaultProps} />);
        expect(wrapper).toMatchSnapshot();
    });

    it('should call onChange when drawn on annotate area', () => {
        const wrapper = mount(<AnnotateArea {...defaultProps} />);
        const area = wrapper.find('[data-testid="annotate-area"]');
        area.simulate('mousedown', { pageX: 2, pageY: 49 });
        area.simulate('mouseup');
        expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with correct pen props if drawn drawn on annotate area with pen', () => {
        const wrapper = mount(<AnnotateArea {...defaultProps} />);
        const area = wrapper.find('[data-testid="annotate-area"]');
        area.simulate('mousedown', { pageX: 2, pageY: 49 });
        area.simulate('mouseup');
        expect(defaultProps.onChange).toHaveBeenCalledWith([{
            color: 'rgba(38, 196, 58, 1)',
            key: 'path0',
            points: [{ x: 0, y: 0 }],
            shouldShow: true,
            strokeWidth: 5,
        }]);
    });

    it('should call onChange with correct highlight props if drawn drawn on annotate area with highlight', () => {
        const highlightProps = {
            paths: [],
            highlightColor: 'rgba(233, 0, 0, 0.64)',
            penColor: 'rgba(38, 196, 58, 1)',
            onChange: jest.fn(),
            imageDimensions: { width: 800, height: 800 },
            annotateAreaDimensions: { width: 800, height: 800 },
            chosenTool: Tool.highlight,
            screenSnippetPath: 'very-nice-path',
        };
        const wrapper = mount(<AnnotateArea {...highlightProps} />);
        const area = wrapper.find('[data-testid="annotate-area"]');
        area.simulate('mousedown', { pageX: 2, pageY: 49 });
        area.simulate('mouseup');
        expect(highlightProps.onChange).toHaveBeenCalledWith([{
            color: 'rgba(233, 0, 0, 0.64)',
            key: 'path0',
            points: [{ x: 0, y: 0 }],
            shouldShow: true,
            strokeWidth: 28,
        }]);
    });

    it('should render path if path is provided in props', () => {
        const pathProps = {
            paths: [{
                points: [{ x: 0, y: 0 }],
                shouldShow: true,
                strokeWidth: 5,
                color: 'rgba(233, 0, 0, 0.64)',
                key: 'path0',
            }],
            highlightColor: 'rgba(233, 0, 0, 0.64)',
            penColor: 'rgba(38, 196, 58, 1)',
            onChange: jest.fn(),
            imageDimensions: { width: 800, height: 800 },
            annotateAreaDimensions: { width: 800, height: 800 },
            chosenTool: Tool.highlight,
            screenSnippetPath: 'very-nice-path',
        };
        const wrapper = mount(<AnnotateArea {...pathProps} />);
        expect(wrapper.find('[data-testid="path0"]').exists()).toEqual(true);
    });

    it('should not render any path if no path is provided in props', () => {
        const wrapper = mount(<AnnotateArea {...defaultProps} />);
        expect(wrapper.find('[data-testid="path0"]').exists()).toEqual(false);
    });

    it('should call onChange with hidden path if clicked on path with tool eraser', () => {
        const pathProps = {
            paths: [{
                points: [{ x: 0, y: 0 }],
                shouldShow: true,
                strokeWidth: 5,
                color: 'rgba(233, 0, 0, 0.64)',
                key: 'path0',
            }],
            highlightColor: 'rgba(233, 0, 0, 0.64)',
            penColor: 'rgba(38, 196, 58, 1)',
            onChange: jest.fn(),
            imageDimensions: { width: 800, height: 800 },
            annotateAreaDimensions: { width: 800, height: 800 },
            chosenTool: Tool.eraser,
            screenSnippetPath: 'very-nice-path',
        };
        const wrapper = mount(<AnnotateArea {...pathProps} />);
        const path = wrapper.find('[data-testid="path0"]');
        path.simulate('click');
        expect(pathProps.onChange).toHaveBeenCalledWith([{
            color: 'rgba(233, 0, 0, 0.64)',
            key: 'path0',
            points: [{ x: 0, y: 0 }],
            shouldShow: false,
            strokeWidth: 5,
        }]);
    });
});
