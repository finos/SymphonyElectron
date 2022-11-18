// import { ipcRenderer } from 'electron';
import * as React from 'react';
import { IListItem } from '../../app/screen-snippet-handler';
import { i18n } from '../../common/i18n-preload';

const { useState, useEffect, useRef } = React;

interface IMenuButtonProps {
  listItems: IListItem[];
  id;
}

const MenuButton: React.FunctionComponent<IMenuButtonProps> = ({
  listItems,
  id,
}) => {
  //#region State
  const [isDisplay, setDisplay] = useState(false);
  const listRef = useRef<HTMLUListElement>(document.createElement('ul'));
  const menuButtonRef = useRef<HTMLButtonElement>(
    document.createElement('button'),
  );
  //#endregion

  //#region Variables
  const testId = {
    menu: `${id}_MENU_BUTTON`,
  };
  //#endregion

  //#region Handlers
  const onClickMenuButton = () => {
    setDisplay(!isDisplay);
  };
  //#endregion

  //#region UseEffect
  useEffect(() => {
    const isContainListElement = (ev) =>
      listRef.current && listRef.current.contains(ev.target as HTMLElement);
    const isContainMenuBtnElement = (ev) =>
      menuButtonRef.current &&
      menuButtonRef.current.contains(ev.target as HTMLElement);
    window.addEventListener('click', (ev: MouseEvent) => {
      if (!isContainListElement(ev) && !isContainMenuBtnElement(ev)) {
        setDisplay(false);
      }
    });
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDisplay(false);
      }
    });

    return () => {
      window.removeEventListener('click', () => {
        if (!isContainListElement || !isContainMenuBtnElement) {
          setDisplay(false);
        }
      });
      window.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setDisplay(false);
        }
      });
    };
  });
  //#endregion

  const renderListItems = () => {
    return listItems.map((listItem) => {
      const sendClick = async () => {
        await listItem.onClick(listItem.event);
        setDisplay(false);
      };

      return (
        <li
          data-testid={`${id}_${listItem.dataTestId}`}
          className='list-item general-font'
          lang={i18n.getLocale()}
          onClick={sendClick}
          key={listItem.event}
        >
          {listItem.name}
        </li>
      );
    });
  };

  //#endregion

  return (
    <>
      <div className='menu-button-wrapper'>
        <button
          className={`menu-button`}
          onClick={onClickMenuButton}
          data-testid={testId.menu}
          ref={menuButtonRef}
        >
          <img
            src={`../renderer/assets/single-chevron-down.svg`}
            title={i18n.t('Open menu')()}
            alt={i18n.t('Open menu')()}
          />
        </button>
        {isDisplay && (
          <ul className='menu' ref={listRef}>
            {renderListItems()}
          </ul>
        )}
      </div>
    </>
  );
};

export default MenuButton;
