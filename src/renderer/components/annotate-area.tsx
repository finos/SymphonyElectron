import { LazyBrush } from 'lazy-brush';
import * as React from 'react';
import { IImageDimensions, IPath, IPoint, Tool } from './snipping-tool';

const { useState } = React;

export interface ISvgPath {
  svgPath: string;
  key: string;
  strokeWidth: number;
  color: string;
  shouldShow: boolean;
}

export interface IAnnotateAreaProps {
  paths: IPath[];
  highlightColor: string;
  penColor: string;
  onChange: (paths: IPath[]) => void;
  imageDimensions: IImageDimensions;
  chosenTool: Tool;
  screenSnippetPath: string;
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

const AnnotateArea: React.FunctionComponent<IAnnotateAreaProps> = ({ paths, highlightColor, penColor, onChange, imageDimensions, chosenTool, screenSnippetPath }) => {
  const [isDrawing, setIsDrawing] = useState(false);

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
      onChange(addHighlightPoint(p, point));
    } else {
      onChange(addPenPoint(p, point));
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
        data-testid={path.key}
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
    <svg
      data-testid='annotate-area'
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
        xlinkHref={screenSnippetPath}
        width={imageDimensions.width}
        height={imageDimensions.height}
        className='SnippetImage'
      />
      {renderPaths(getSvgPathsData(paths))}
    </svg>
  );
};

export default AnnotateArea;
