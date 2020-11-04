import { ipcRenderer } from 'electron';
import * as React from 'react';
import { i18n } from '../../common/i18n-preload';

const { useState, useEffect } = React;

interface IProps {
  drawEnabled: boolean;
  highlightEnabled: boolean;
  eraseEnabled: boolean;
}

const SNIPPING_TOOL_NAMESPACE = 'ScreenSnippet';

const SnippingTool: React.FunctionComponent<IProps> = ({drawEnabled, highlightEnabled, eraseEnabled}) => {

  const [screenSnippet, setScreenSnippet] = useState('Screen-Snippet');
  const [imageDimensions, setImageDimensions] = useState({height: 600, width: 800});

  const getSnipImageData = (_event, {snipImage, height, width}) => {
    setScreenSnippet(snipImage);
    setImageDimensions({height, width});
  };

  ipcRenderer.on('snipping-tool-data', getSnipImageData);

  useEffect(() => {
    return () => {
      ipcRenderer.removeListener('snipping-tool-data', getSnipImageData);
    };
  }, []);

  const usePen = () => {
    // setTool("pen");
    // setShouldRenderPenColorPicker(shouldRenderPenColorPicker => !shouldRenderPenColorPicker);
    // setShouldRenderHighlightColorPicker(false);
  };

  const useHighlight = () => {
    // setTool("highlight");
    // setShouldRenderHighlightColorPicker(shouldRenderHighlightColorPicker => !shouldRenderHighlightColorPicker);
    // setShouldRenderPenColorPicker(false);
  };

  const useEraser = () => {
    // setTool("eraser");
  };

  const clear = () => {
    // const updPaths = [...paths];
    // updPaths.map((p) => {
    //   p.shouldShow = false;
    //   return p;
    // });
    // setPaths(updPaths);
  };

  const done = () => {
    ipcRenderer.send('upload-snippet', screenSnippet);
  };

  return (
    <div className='SnippingTool' lang={i18n.getLocale()}>
      <header>
        <div className='DrawActions'>
          <button
            className={
              drawEnabled ? 'ActionButtonSelected' : 'ActionButton'
            }
            onClick={usePen}
          >
            <img src='../renderer/assets/snip-draw.svg' />
          </button>
          <button
            className={
              highlightEnabled
                ? 'ActionButtonSelected'
                : 'ActionButton'
            }
            onClick={useHighlight}
          >
            <img src='../renderer/assets/snip-highlight.svg' />
          </button>
          <button
            className={
              eraseEnabled
                ? 'ActionButtonSelected'
                : 'ActionButton'
            }
            onClick={useEraser}
          >
            <img src='../renderer/assets/snip-erase.svg' />
          </button>
        </div>
        <div className='ClearActions'>
          <button
            className='ClearButton'
            onClick={clear}
          >
            {i18n.t('Clear', SNIPPING_TOOL_NAMESPACE)()}
          </button>
        </div>
      </header>

      <main>
        <img
          src={screenSnippet}
          width={imageDimensions.width}
          height={imageDimensions.height}
          className='SnippetImage'
          alt={i18n.t('Screen snippet', SNIPPING_TOOL_NAMESPACE)()}
        />
      </main>

      <footer>
        <button onClick={done}>
          {i18n.t('Done', SNIPPING_TOOL_NAMESPACE)()}
        </button>
      </footer>
    </div>
  );
};

export default SnippingTool;
