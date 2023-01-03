import { mount, shallow } from 'enzyme';
import * as React from 'react';
import { ScreenShotAnnotation } from '../src/common/ipcEvent';
import MenuButton from '../src/renderer/components/menu-button';

afterEach(() => {
  jest.clearAllMocks();
});

describe('Menu Button', () => {
  //#region Logic
  const waitForPromisesToResolve = () =>
    new Promise((resolve) => setTimeout(resolve));
  //#endregion

  //#region Mock
  const copyToClipboardFn = jest.fn();
  const saveAsFn = jest.fn();
  copyToClipboardFn.mockImplementation((event) => {
    return event;
  });
  saveAsFn.mockImplementation((event) => {
    return event;
  });
  const menuItem = [
    {
      name: 'Copy to clipboard',
      event: ScreenShotAnnotation.COPY_TO_CLIPBOARD,
      onClick: copyToClipboardFn,
      dataTestId: 'COPY_TO_CLIPBOARD',
    },
    {
      name: 'Save as',
      event: ScreenShotAnnotation.SAVE_AS,
      onClick: saveAsFn,
      dataTestId: 'SAVE_AS',
    },
  ];
  //#endregion

  it('should show all elements', () => {
    const wrapper = shallow(React.createElement(MenuButton));
    expect(wrapper).toMatchSnapshot();
  });

  it('should call event on click copy to clipboard', async () => {
    const wrapper = mount(
      <MenuButton id='snipping-tool' listItems={menuItem} />,
    );

    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    wrapper
      .find('[data-testid="snipping-tool_COPY_TO_CLIPBOARD"]')
      .simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(copyToClipboardFn).toBeCalledWith(
      ScreenShotAnnotation.COPY_TO_CLIPBOARD,
    );
  });

  it('should call event on click save as', async () => {
    const wrapper = mount(
      <MenuButton id='snipping-tool' listItems={menuItem} />,
    );

    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    wrapper.find('[data-testid="snipping-tool_SAVE_AS"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(saveAsFn).toBeCalledWith(ScreenShotAnnotation.SAVE_AS);
  });

  it('should disappear on click to other element', async () => {
    const wrapper = mount(
      <MenuButton id='snipping-tool' listItems={menuItem} />,
    );

    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    await waitForPromisesToResolve();
    expect(wrapper.find('.menu').exists()).toBeFalsy();
  });

  it('should focus menu list on up', async () => {
    const wrapper = mount(
      <MenuButton id='snipping-tool' listItems={menuItem} />,
    );

    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    wrapper
      .find('[data-testid="snipping-tool_MENU_BUTTON"]')
      .simulate('keyup', { key: 'ArrowUp' });
    wrapper.update();
    expect(
      (wrapper.find('[data-testid="snipping-tool_SAVE_AS"]').instance() as any)
        .dataset.isfocused,
    ).toBe('true');
  });

  it('should focus menu list on down', async () => {
    const wrapper = mount(
      <MenuButton id='snipping-tool' listItems={menuItem} />,
    );

    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    wrapper
      .find('[data-testid="snipping-tool_MENU_BUTTON"]')
      .simulate('keyup', { key: 'ArrowDown' });
    wrapper.update();
    expect(
      (
        wrapper
          .find('[data-testid="snipping-tool_COPY_TO_CLIPBOARD"]')
          .instance() as any
      ).dataset.isfocused,
    ).toBe('true');
  });

  it('should go down on press down', async () => {
    const wrapper = mount(
      <MenuButton id='snipping-tool' listItems={menuItem} />,
    );

    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    wrapper
      .find('[data-testid="snipping-tool_MENU_BUTTON"]')
      .simulate('keyup', { key: 'ArrowDown' });
    wrapper.update();
    wrapper
      .find('[data-testid="snipping-tool_LIST"]')
      .simulate('keyup', { key: 'ArrowDown' });
    wrapper.update();
    expect(
      (wrapper.find('[data-testid="snipping-tool_SAVE_AS"]').instance() as any)
        .dataset.isfocused,
    ).toBe('true');
  });

  it('should go up on press up', async () => {
    const wrapper = mount(
      <MenuButton id='snipping-tool' listItems={menuItem} />,
    );

    wrapper.find('[data-testid="snipping-tool_MENU_BUTTON"]').simulate('click');
    wrapper.update();
    wrapper
      .find('[data-testid="snipping-tool_MENU_BUTTON"]')
      .simulate('keyup', { key: 'ArrowUp' });
    wrapper
      .find('[data-testid="snipping-tool_LIST"]')
      .simulate('keyup', { key: 'ArrowUp' });
    wrapper.update();
    expect(
      (
        wrapper
          .find('[data-testid="snipping-tool_COPY_TO_CLIPBOARD"]')
          .instance() as any
      ).dataset.isfocused,
    ).toBe('true');
  });
});
