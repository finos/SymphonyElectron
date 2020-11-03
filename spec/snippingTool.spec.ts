import { shallow } from 'enzyme';
import * as React from 'react';
import SnippingTool from '../src/renderer/components/snipping-tool';
import { ipcRenderer } from './__mocks__/electron';

describe('Snipping Tool', () => {
    const snippingToolLabel = 'snipping-tool-data';
    const snippingToolMockState = {
        snipImage: 'https://croatia.hr/sites/default/files/styles/image_full_width/public/2017-08/02_01_slide_nature.jpg',
        width: 872,
        height: 920,
    };
    const onLabelEvent = 'on';
    const removeListenerLabelEvent = 'removeListener';

    it('should render correctly', () => {
        const wrapper = shallow(React.createElement(SnippingTool));
        expect(wrapper).toMatchSnapshot();
    });

    it('should call `snipping-tool-data` event when component is mounted', () => {
        const spy = jest.spyOn(ipcRenderer, onLabelEvent);
        shallow(React.createElement(SnippingTool));
        expect(spy).toBeCalledWith(snippingToolLabel, expect.any(Function));
    });

    it('should remove listener `snipping-tool-data` when component is unmounted', () => {
        const spyMount = jest.spyOn(ipcRenderer, onLabelEvent);
        const spyUnmount = jest.spyOn(ipcRenderer, removeListenerLabelEvent);

        const wrapper = shallow(React.createElement(SnippingTool));
        expect(spyMount).toBeCalledWith(snippingToolLabel, expect.any(Function));

        wrapper.unmount();
        expect(spyUnmount).toBeCalledWith(snippingToolLabel, expect.any(Function));
    });

    it('should call `updateState` when component is mounted', () => {
        const spy = jest.spyOn(SnippingTool.prototype, 'setState');
        shallow(React.createElement(SnippingTool));

        ipcRenderer.send('snipping-tool-data', snippingToolMockState);

        expect(spy).toBeCalledWith(snippingToolMockState);
    });

});
