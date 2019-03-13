import { shallow } from 'enzyme';
import * as React from 'react';
import LoadingScreen from '../src/renderer/components/loading-screen';

describe('loading screen', () => {
    it('should render correctly', () => {
        const wrapper = shallow(React.createElement(LoadingScreen));
        expect(wrapper).toMatchSnapshot();
    });

    it('should show app name correctly', () => {
        const customSelector = '.LoadingScreen-name';
        const wrapper = shallow(React.createElement(LoadingScreen));
        const expectedValue = 'Symphony';
        expect(wrapper.find(customSelector).text()).toBe(expectedValue);
    });
});
