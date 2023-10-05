import { LazyBrush } from 'lazy-brush';
import * as React from 'react';
import {
  AnalyticsElements,
  ScreenSnippetActionTypes,
} from '../../app/bi/analytics-handler';
import {
  IDimensions,
  IPath,
  IPoint,
  sendAnalyticsToMain,
  Tool,
} from './snipping-tool';

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
  imageDimensions: IDimensions;
  annotateAreaDimensions: IDimensions;
  chosenTool: Tool;
  backgroundImagePath?: string;
}

const lazy = new LazyBrush({
  radius: 3,
  enabled: true,
  initialPoint: { x: 0, y: 0 },
});
const PEN_WIDTH = 5;
const HIGHLIGHT_WIDTH = 28;

const AnnotateArea: React.FunctionComponent<IAnnotateAreaProps> = ({
  paths,
  highlightColor,
  penColor,
  onChange,
  imageDimensions,
  chosenTool,
  backgroundImagePath,
  annotateAreaDimensions,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);

  const maybeErasePath = (key: string) => {
    if (chosenTool === Tool.eraser) {
      const updPaths = [...paths];
      updPaths.map((p) => {
        if (p && p.key === key) {
          p.shouldShow = false;
          sendAnalyticsToMain(
            AnalyticsElements.SCREEN_CAPTURE_ANNOTATE,
            ScreenSnippetActionTypes.ANNOTATE_ERASED,
          );
        }
        return p;
      });
      onChange(updPaths);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  // Utility functions

  const getMousePosition = (e: React.MouseEvent) => {
    const target = document.getElementById('annotate-area');
    if (target) {
      const rect = target.getBoundingClientRect();
      // Offseting the scrolled X and Y inside the annotate area
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return {
      x: e.clientX,
      y: e.clientY,
    };
  };

  // Render and preparing render functions

  const addHighlightPoint = (paths: IPath[], point: IPoint) => {
    if (isDrawing) {
      const activePath = paths[paths.length - 1];
      activePath.points.push(point);
    } else {
      const shouldShow = true;
      const key = 'path' + paths.length;
      paths.push({
        points: [point],
        color: highlightColor,
        strokeWidth: HIGHLIGHT_WIDTH,
        shouldShow,
        key,
      });
    }
    return paths;
  };

  const addPenPoint = (paths: IPath[], point: IPoint) => {
    if (isDrawing) {
      const activePath = paths[paths.length - 1];
      activePath.points.push(point);
    } else {
      const shouldShow = true;
      const key = 'path' + paths.length;
      paths.push({
        points: [point],
        color: penColor,
        strokeWidth: PEN_WIDTH,
        shouldShow,
        key,
      });
    }
    return paths;
  };

  const addPathPoint = (e: React.MouseEvent) => {
    const p = [...paths];
    const mousePos: IPoint = getMousePosition(e);
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

  const handleMouseUp = () => {
    stopDrawing();
    if (chosenTool === Tool.pen) {
      sendAnalyticsToMain(
        AnalyticsElements.SCREEN_CAPTURE_ANNOTATE,
        ScreenSnippetActionTypes.ANNOTATE_ADDED_PEN,
      );
    }
    if (chosenTool === Tool.highlight) {
      sendAnalyticsToMain(
        AnalyticsElements.SCREEN_CAPTURE_ANNOTATE,
        ScreenSnippetActionTypes.ANNOTATE_ADDED_HIGHLIGHT,
      );
    }
  };

  const getAnnotateWrapperStyle = () => {
    const shouldShowScrollBars =
      imageDimensions.height > annotateAreaDimensions.height ||
      imageDimensions.width > annotateAreaDimensions.width;
    return {
      width: annotateAreaDimensions.width,
      height: annotateAreaDimensions.height,
      ...(shouldShowScrollBars && { overflow: 'scroll' }),
    };
  };

  return (
    <div id='annotate-wrapper' style={getAnnotateWrapperStyle()}>
      <svg
        data-testid='annotate-area'
        style={{ cursor: 'crosshair' }}
        id='annotate-area'
        width={imageDimensions.width}
        height={imageDimensions.height}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={stopDrawing}
      >
        {backgroundImagePath && (
          <image
            x={0}
            y={0}
            id='backgroundImage'
            xlinkHref={backgroundImagePath}
            width={imageDimensions.width}
            height={imageDimensions.height}
          />
        )}
        {renderPaths(getSvgPathsData(paths))}
      </svg>
    </div>
  );
};

export default AnnotateArea;
