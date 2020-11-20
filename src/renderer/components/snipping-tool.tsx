import { ipcRenderer } from 'electron';
import * as React from 'react';
import { i18n } from '../../common/i18n-preload';
import AnnotateArea from './annotate-area';
import ColorPickerPill, { IColor } from './color-picker-pill';

const { useState, useRef, useEffect } = React;

export enum Tool {
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

export interface IImageDimensions {
  width: number;
  height: number;
}

export interface ISnippingToolProps {
  existingPaths?: IPath[];
}

const availablePenColors: IColor[] = [
  { rgbaColor: 'rgba(0, 0, 40, 1)' },
  { rgbaColor: 'rgba(0, 142, 255, 1)' },
  { rgbaColor: 'rgba(38, 196, 58, 1)' },
  { rgbaColor: 'rgba(246, 178, 2, 1)' },
  { rgbaColor: 'rgba(255, 255, 255, 1)', outline: 'rgba(207, 208, 210, 1)' },
];
const availableHighlightColors: IColor[] = [
  { rgbaColor: 'rgba(0, 142, 255, 0.64)' },
  { rgbaColor: 'rgba(38, 196, 58, 0.64)' },
  { rgbaColor: 'rgba(246, 178, 2, 0.64)' },
  { rgbaColor: 'rgba(233, 0, 0, 0.64)' },
];
const SNIPPING_TOOL_NAMESPACE = 'ScreenSnippet';

const SnippingTool: React.FunctionComponent<ISnippingToolProps> = ({ existingPaths }) => {
  // State preparation functions

  const [screenSnippetPath, setScreenSnippetPath] = useState('Screen-Snippet');
  const [imageDimensions, setImageDimensions] = useState({
    height: 600,
    width: 800,
  });
  const [paths, setPaths] = useState<IPath[]>(existingPaths || []);
  const [chosenTool, setChosenTool] = useState(Tool.pen);
  const [penColor, setPenColor] = useState<IColor>({ rgbaColor: 'rgba(0, 142, 255, 1)' });
  const [highlightColor, setHighlightColor] = useState<IColor>(
    { rgbaColor: 'rgba(0, 142, 255, 0.64)' },
  );
  const [
    shouldRenderHighlightColorPicker,
    setShouldRenderHighlightColorPicker,
  ] = useState(false);
  const [shouldRenderPenColorPicker, setShouldRenderPenColorPicker] = useState(
    false,
  );

  const getSnipImageData = ({ }, { snipImage, height, width }) => {
    setScreenSnippetPath(snipImage);
    setImageDimensions({ height, width });
  };

  ipcRenderer.once('snipping-tool-data', getSnipImageData);

  // Hook that alerts clicks outside of the passed refs
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

  const penColorChosen = (color: IColor) => {
    setPenColor(color);
    setShouldRenderPenColorPicker(false);
  };

  const highlightColorChosen = (color: IColor) => {
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

  const getBase64PngData = () => {
    const canvas = document.createElement('canvas');
    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;

    // Creates an in memory canvas for mounting img data without adding it to the DOM
    const ctx = canvas?.getContext('2d') as CanvasRenderingContext2D;

    if (!ctx) {
      // Will only be the case in headless browsers, such as with unit tests
      return 'NO CANVAS';
    }

    // Creates an in memory img without adding it to the DOM
    const img = document.createElement('img');

    const svg = document.getElementById('annotate-area') as HTMLImageElement;
    // Parses SVG image to XML data
    const svgData = new XMLSerializer().serializeToString(svg);
    // Adds the extracted XML data to the in memory img
    img.setAttribute(
      'src',
      'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData))),
    );
    const screenSnippet = document.getElementById('screenSnippet') as HTMLImageElement;

    return new Promise((resolve, reject) => {
      // Listens to when the img is loaded in memory and adds the data from the SVG paths + screenSnippet to the canvas
      img.onload = () => {
        ctx.drawImage(screenSnippet, 0, 0);
        ctx.drawImage(img, 0, 0);
        try {
          // Extracts base 64 png img data from the canvas
          const data = canvas.toDataURL('image/png');
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };
    });
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
      const color = penColor.outline ? penColor.outline : penColor.rgbaColor;
      return { border: '2px solid ' + color };
    } else if (chosenTool === Tool.highlight) {
      const color = highlightColor.outline ? highlightColor.outline : highlightColor.rgbaColor;
      return { border: '2px solid ' + color };
    } else if (chosenTool === Tool.eraser) {
      return { border: '2px solid #008EFF' };
    }
    return undefined;
  };

  const done = async () => {
    const base64PngData = await getBase64PngData();
    ipcRenderer.send('upload-snippet', { screenSnippetPath, base64PngData });
  };

  return (
    <div className='SnippingTool' lang={i18n.getLocale()}>
      <header>
        <div className='DrawActions'>
          <button
            data-testid='pen-button'
            style={getBorderStyle(Tool.pen)}
            className='ActionButton'
            onClick={usePen}
            title={i18n.t('Pen', SNIPPING_TOOL_NAMESPACE)()}
          >
            <img src='../renderer/assets/snip-draw.svg' />
          </button>
          <button
            data-testid='highlight-button'
            style={getBorderStyle(Tool.highlight)}
            className='ActionButton'
            onClick={useHighlight}
            title={i18n.t('Highlight', SNIPPING_TOOL_NAMESPACE)()}
          >
            <img src='../renderer/assets/snip-highlight.svg' />
          </button>
          <button
            data-testid='erase-button'
            style={getBorderStyle(Tool.eraser)}
            className='ActionButton'
            onClick={useEraser}
            title={i18n.t('Erase', SNIPPING_TOOL_NAMESPACE)()}
          >
            <img src='../renderer/assets/snip-erase.svg' />
          </button>
        </div>
        <div className='ClearActions'>
          <button
            data-testid='clear-button'
            className='ClearButton'
            onClick={clear}
          >
            {i18n.t('Clear', SNIPPING_TOOL_NAMESPACE)()}
          </button>
        </div>
      </header>

      {
        shouldRenderPenColorPicker && (
          <div style={{ marginTop: '64px', position: 'absolute', left: '50%' }} ref={colorPickerRef}>
            <div style={{ position: 'relative', left: '-50%' }}>
              <ColorPickerPill
                data-testid='pen-colorpicker'
                availableColors={markChosenColor(availablePenColors, penColor.rgbaColor)}
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
                data-testid='highlight-colorpicker'
                availableColors={markChosenColor(
                  availableHighlightColors,
                  highlightColor.rgbaColor,
                )}
                onChange={highlightColorChosen}
              />
            </div>
          </div>
        )
      }

      <main>
        <div className='imageContainer'>
          <AnnotateArea
            data-testid='annotate-component'
          paths={paths}
          highlightColor={highlightColor.rgbaColor}
            penColor={penColor.rgbaColor}
            onChange={setPaths}
            imageDimensions={imageDimensions}
            screenSnippetPath={screenSnippetPath}
            chosenTool={chosenTool}
          />
        </div>
      </main>
      <footer>
        <button
          data-testid='done-button'
          className='DoneButton'
          onClick={done}>
          {i18n.t('Done', SNIPPING_TOOL_NAMESPACE)()}
        </button>
      </footer>
    </div >
  );
};

export default SnippingTool;
