import { ipcRenderer } from 'electron';
import * as React from 'react';
import { i18n } from '../../common/i18n-preload';
import ColorPickerPill, { IColor } from './color-picker-pill';

const { useState, useCallback, useRef, useEffect } = React;

enum Tool {
  pen = 'PEN',
  highlight = 'HIGHLIGHT',
  eraser = 'ERASER',
}

export interface IPath {
  points: IPoint[];
  color: string;
  strokeWidth: number;
  shouldShow: boolean;
  key: string;
}

export interface IPoint {
  x: number;
  y: number;
}

export interface ISvgPath {
  svgPath: string;
  key: string;
  strokeWidth: number;
  color: string;
  shouldShow: boolean;
}

const availablePenColors: IColor[] = [
  { rgbaColor: 'rgba(0, 0, 40, 1)' },
  { rgbaColor: 'rgba(0, 142, 255, 1)' },
  { rgbaColor: 'rgba(38, 196, 58, 1)' },
  { rgbaColor: 'rgba(246, 178, 2, 1)' },
  { rgbaColor: 'rgba(255, 255, 255, 1)', outline: 'rgba(0, 0, 0, 1)' },
];
const availableHighlightColors: IColor[] = [
  { rgbaColor: 'rgba(0, 142, 255, 0.64)' },
  { rgbaColor: 'rgba(38, 196, 58, 0.64)' },
  { rgbaColor: 'rgba(246, 178, 2, 0.64)' },
  { rgbaColor: 'rgba(233, 0, 0, 0.64)' },
];
const SNIPPING_TOOL_NAMESPACE = 'ScreenSnippet';

const SnippingTool = () => {
  // State and ref preparation functions

  const [screenSnippet, setScreenSnippet] = useState('Screen-Snippet');
  const [imageDimensions, setImageDimensions] = useState({
    height: 600,
    width: 800,
  });
  const [paths, setPaths] = useState<IPath[]>([]);
  const [chosenTool, setChosenTool] = useState(Tool.pen);
  const [annotateAreaLocation, setAnnotateAreaLocation] = useState({
    left: 0,
    top: 0,
  });
  const [penColor, setPenColor] = useState('rgba(0, 142, 255, 1)');
  const [highlightColor, setHighlightColor] = useState(
    'rgba(0, 142, 255, 0.64)',
  );
  const [
    shouldRenderHighlightColorPicker,
    setShouldRenderHighlightColorPicker,
  ] = useState(false);
  const [shouldRenderPenColorPicker, setShouldRenderPenColorPicker] = useState(
    false,
  );

  const getSnipImageData = ({ }, { snipImage, height, width }) => {
    setScreenSnippet(snipImage);
    setImageDimensions({ height, width });
  };

  ipcRenderer.on('snipping-tool-data', getSnipImageData);

  useEffect(() => {
    return () => {
      ipcRenderer.removeListener('snipping-tool-data', getSnipImageData);
    };
  }, []);

  const annotateRef = useCallback((domNode) => {
    if (domNode) {
      setAnnotateAreaLocation(domNode.getBoundingClientRect());
    }
  }, []);

  // Hook that alerts clicks outside of the passed ref
  const useClickOutsideExaminer = (
    colorPickerRf: React.RefObject<HTMLDivElement>,
    penRf: React.RefObject<HTMLButtonElement>,
    highlightRf: React.RefObject<HTMLButtonElement>,
  ) => {
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          !colorPickerRf?.current?.contains(event.target as Node) &&
          !penRf?.current?.contains(event.target as Node) &&
          !highlightRf?.current?.contains(event.target as Node)
        ) {
          setShouldRenderHighlightColorPicker(false);
          setShouldRenderPenColorPicker(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [colorPickerRf, penRf, highlightRf]);
  };

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLButtonElement>(null);
  const highlightRef = useRef<HTMLButtonElement>(null);
  useClickOutsideExaminer(colorPickerRef, penRef, highlightRef);

  // State mutating functions

  const penColorChosen = (color: string) => {
    setPenColor(color);
    setShouldRenderPenColorPicker(false);
  };

  const highlightColorChosen = (color: string) => {
    setHighlightColor(color);
    setShouldRenderHighlightColorPicker(false);
  };

  const usePen = () => {
    setChosenTool(Tool.pen);
    setShouldRenderPenColorPicker(!shouldRenderPenColorPicker);
    setShouldRenderHighlightColorPicker(false);
  };

  const useHighlight = () => {
    setChosenTool(Tool.highlight);
    setShouldRenderHighlightColorPicker(!shouldRenderHighlightColorPicker);
    setShouldRenderPenColorPicker(false);
  };

  const useEraser = () => {
    setChosenTool(Tool.eraser);
  };

  const clear = () => {
    const updPaths = [...paths];
    updPaths.map((p) => {
      p.shouldShow = false;
      return p;
    });
    setPaths(updPaths);
  };

  // Utility functions

  const getMousePosition = (e: React.MouseEvent) => {
    return {
      x: e.pageX - annotateAreaLocation.left,
      y: e.pageY - annotateAreaLocation.top,
    };
  };

  const markChosenColor = (colors: IColor[], chosenColor: string) => {
    return colors.map((color) => {
      if (color.rgbaColor === chosenColor) {
        return { ...color, chosen: true };
      } else {
        return color;
      }
    });
  };

  const getBorderStyle = (tool: Tool) => {
    if (chosenTool !== tool) {
      return undefined;
    }
    if (chosenTool === Tool.pen) {
      return { border: '2px solid ' + penColor };
    } else if (chosenTool === Tool.highlight) {
      return { border: '2px solid ' + highlightColor };
    } else if (chosenTool === Tool.eraser) {
      return { border: '2px solid #008EFF' };
    }
    return undefined;
  };

  const done = (e) => {
    getMousePosition(e);
    ipcRenderer.send('upload-snippet', screenSnippet);
  };

  return (
    <div className='SnippingTool' lang={i18n.getLocale()}>
      <header>
        <div className='DrawActions'>
          <button
            style={getBorderStyle(Tool.pen)}
            className='ActionButton'
            onClick={usePen}
          >
            <img src='../renderer/assets/snip-draw.svg' />
          </button>
          <button
            style={getBorderStyle(Tool.highlight)}
            className='ActionButton'
            onClick={useHighlight}
          >
            <img src='../renderer/assets/snip-highlight.svg' />
          </button>
          <button
            style={getBorderStyle(Tool.eraser)}
            className='ActionButton'
            onClick={useEraser}
          >
            <img src='../renderer/assets/snip-erase.svg' />
          </button>
        </div>
        <div className='ClearActions'>
          <button className='ClearButton' onClick={clear}>
            {i18n.t('Clear', SNIPPING_TOOL_NAMESPACE)()}
          </button>
        </div>
      </header>;

      {
        shouldRenderPenColorPicker && (
          <div style={{ marginTop: '64px', position: 'absolute', left: '50%' }} ref={colorPickerRef}>
            <div style={{ position: 'relative', left: '-50%' }}>
              <ColorPickerPill
                availableColors={markChosenColor(availablePenColors, penColor)}
                onChange={penColorChosen}
              />
            </div>
          </div>
        )
      }
      {
        shouldRenderHighlightColorPicker && (
          <div style={{ marginTop: '64px', position: 'absolute', left: '50%' }} ref={colorPickerRef}>
            <div style={{ position: 'relative', left: '-50%' }}>
              <ColorPickerPill
                availableColors={markChosenColor(
                  availableHighlightColors,
                  highlightColor,
                )}
                onChange={highlightColorChosen}
              />
            </div>
          </div>
        )
      }

      <main>
        <div ref={annotateRef}>
          <img
            src={screenSnippet}
            width={imageDimensions.width}
            height={imageDimensions.height}
            className='SnippetImage'
            alt={i18n.t('Screen snippet', SNIPPING_TOOL_NAMESPACE)()}
          />
        </div>
      </main>

      <footer>
        <button onClick={done}>
          {i18n.t('Done', SNIPPING_TOOL_NAMESPACE)()}
        </button>
      </footer>
    </div >
  );
};

export default SnippingTool;
