import { ipcRenderer } from 'electron';
import { LazyBrush } from 'lazy-brush';
import * as React from 'react';
import { i18n } from '../../common/i18n-preload';
import ColorPickerPill, { IColor } from './color-picker-pill';

const { useState, useRef, useEffect } = React;

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

const lazy = new LazyBrush({
  radius: 3,
  enabled: true,
  initialPoint: { x: 0, y: 0 },
});
const TOP_MENU_HEIGHT = 48;
const MIN_ANNOTATE_AREA_HEIGHT = 200;
const MIN_ANNOTATE_AREA_WIDTH = 312;
const PEN_WIDTH = 5;
const HIGHLIGHT_WIDTH = 28;
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<IPath[]>([]);
  const [chosenTool, setChosenTool] = useState(Tool.pen);
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
    // Clear logic here
  };

  const maybeErasePath = (key: string) => {
    // erase logic here
    return key;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  // Utility functions

  const getMousePosition = (e: React.MouseEvent) => {
    // We need to offset for elements in the window that is not the annotate area
    const x = imageDimensions.width >= MIN_ANNOTATE_AREA_WIDTH ? e.pageX : e.pageX - (MIN_ANNOTATE_AREA_WIDTH - imageDimensions.width) / 2;
    const y = imageDimensions.height >= MIN_ANNOTATE_AREA_HEIGHT ? (e.pageY - TOP_MENU_HEIGHT) : (e.pageY - ((MIN_ANNOTATE_AREA_HEIGHT - imageDimensions.height) / 2) - TOP_MENU_HEIGHT);
    return { x, y };
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

  const done = () => {
    ipcRenderer.send('upload-snippet', screenSnippet);
  };

  // Render and preparing render functions

  const addHighlightPoint = (paths: IPath[], point: IPoint) => {
    const activePath = paths[paths.length - 1];
    const shouldShow = true;
    const key = 'path' + paths.length;
    if (!isDrawing) {
      paths.push({
        points: [point],
        color: highlightColor,
        strokeWidth: HIGHLIGHT_WIDTH,
        shouldShow,
        key,
      });
    } else {
      activePath.points.push(point);
    }
    return paths;
  };

  const addPenPoint = (paths: IPath[], point: IPoint) => {
    const activePath = paths[paths.length - 1];
    const shouldShow = true;
    const key = 'path' + paths.length;
    if (!isDrawing) {
      paths.push({
        points: [point],
        color: penColor,
        strokeWidth: PEN_WIDTH,
        shouldShow,
        key,
      });
    } else {
      activePath.points.push(point);
    }
    return paths;
  };

  const addPathPoint = (e: React.MouseEvent) => {
    const p = [...paths];
    const mousePos = getMousePosition(e);
    lazy.update({ x: mousePos.x, y: mousePos.y });
    const point: IPoint = lazy.getBrushCoordinates();
    if (chosenTool === Tool.highlight) {
      setPaths(addHighlightPoint(p, point));
    } else {
      setPaths(addPenPoint(p, point));
    }
    if (!isDrawing) {
      setIsDrawing(true);
    }
  };

  const renderPath = (path: ISvgPath) => {
    return (
      <path
        pointerEvents={path.shouldShow ? 'visiblePainted' : 'none'}
        style={{ display: path.shouldShow ? 'block' : 'none' }}
        key={path.key}
        stroke={path.color}
        strokeLinecap='round'
        strokeWidth={path.strokeWidth || 5}
        d={path.svgPath}
        fill='none'
        onClick={() => maybeErasePath(path.key)}
      />
    );
  };

  const renderPaths = (paths: ISvgPath[]) => {
    return paths.map((path) => renderPath(path));
  };

  const getSvgDot = (point: IPoint) => {
    const { x, y } = point;
    // This is the SVG path data for a dot at the location of x, y
    return (
      'M ' +
      x +
      ' ' +
      y +
      ' m -0.1, 0 a 0.1,0.1 0 1,0 0.2,0 a 0.1,0.1 0 1,0 -0.2,0'
    );
  };

  const getSvgPath = (points: IPoint[]) => {
    let stroke = '';
    if (points && points.length > 0) {
      // Start point of path
      stroke = `M ${points[0].x} ${points[0].y}`;
      let p1: IPoint;
      let p2: IPoint;
      let end: IPoint;
      // Adding points from points array to SVG curve path
      for (let i = 1; i < points.length - 2; i += 2) {
        p1 = points[i];
        p2 = points[i + 1];
        end = points[i + 2];
        stroke += ` C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${end.x} ${end.y}`;
      }
    }
    return stroke;
  };

  const getSvgPathData = (path: IPath) => {
    const points = path.points;
    const x = points[0].x;
    const y = points[0].y;
    let data: string;
    // Since a path must got from point A to point B, we need at least two X and Y pairs to render something.
    // Therefore we start with render a dot, so that the user gets visual feedback from only one X and Y pair.
    data = getSvgDot({ x, y });
    data += getSvgPath(points);

    return {
      svgPath: data,
      key: path && path.key,
      strokeWidth: path && path.strokeWidth,
      color: path && path.color,
      shouldShow: path && path.shouldShow,
    };
  };

  const getSvgPathsData = (paths: IPath[]) => {
    return paths.map((path) => getSvgPathData(path));
  };

  // Mouse tracking functions

  const handleMouseDown = (e: React.MouseEvent) => {
    if (chosenTool === Tool.eraser) {
      return;
    }
    addPathPoint(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || chosenTool === Tool.eraser) {
      return;
    }
    addPathPoint(e);
  };

  return (
    <div className='SnippingTool' lang={i18n.getLocale()}>
      <header>
        <div className='DrawActions'>
          <button
            style={getBorderStyle(Tool.pen)}
            className='ActionButton'
            onClick={usePen}
            title={i18n.t('Pen', SNIPPING_TOOL_NAMESPACE)()}
          >
            <img src='../renderer/assets/snip-draw.svg' />
          </button>
          <button
            style={getBorderStyle(Tool.highlight)}
            className='ActionButton'
            onClick={useHighlight}
            title={i18n.t('Highlight', SNIPPING_TOOL_NAMESPACE)()}
          >
            <img src='../renderer/assets/snip-highlight.svg' />
          </button>
          <button
            style={getBorderStyle(Tool.eraser)}
            className='ActionButton'
            onClick={useEraser}
            title={i18n.t('Erase', SNIPPING_TOOL_NAMESPACE)()}
          >
            <img src='../renderer/assets/snip-erase.svg' />
          </button>
        </div>
        <div className='ClearActions'>
          <button className='ClearButton' onClick={clear}>
            {i18n.t('Clear', SNIPPING_TOOL_NAMESPACE)()}
          </button>
        </div>
      </header>

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

      <main style={{ minHeight: MIN_ANNOTATE_AREA_HEIGHT }}>
        <div>
          <svg
            style={{ cursor: 'crosshair' }}
            id='annotate'
            width={imageDimensions.width}
            height={imageDimensions.height}
            onMouseDown={handleMouseDown}
            onMouseUp={stopDrawing}
            onMouseMove={handleMouseMove}
            onMouseLeave={stopDrawing}
          >
            <image
              x={0}
              y={0}
              id='screenSnippet'
              xlinkHref={screenSnippet}
              width={imageDimensions.width}
              height={imageDimensions.height}
              className='SnippetImage'
          />
            {renderPaths(getSvgPathsData(paths))}
          </svg>
        </div>
      </main>

      <footer>
        <button className='DoneButton' onClick={done}>
          {i18n.t('Done', SNIPPING_TOOL_NAMESPACE)()}
        </button>
      </footer>
    </div >
  );
};

export default SnippingTool;
