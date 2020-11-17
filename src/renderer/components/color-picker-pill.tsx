import * as React from 'react';

export interface IColorPickerPillProps {
  availableColors: IColor[];
  onChange: (color: string) => void;
}

export interface IColor {
  rgbaColor: string; // Should be provided as a rgba string i.e. 'rgba(255, 0, 0, 0.3)'
  outline?: string; // Should be provided as a rgba string i.e. 'rgba(255, 0, 0, 0.3)'
  chosen?: boolean;
}

const ColorPickerPill = (props: IColorPickerPillProps) => {
  const getChosenColor = (colors: IColor[]) => {
    return colors.find((color) => color.chosen === true);
  };
  const chosenColor = getChosenColor(props.availableColors);

  const ColorDot = (color: IColor) => {
    const isChosenColor = color === chosenColor;
    const hasOutline = !!color.outline;
    const border = 'solid 1px ' + color.outline;

    const getWidthAndHeight = () => {
      if (isChosenColor) {
        return hasOutline ? '22px' : '24px';
      }
      return hasOutline ? '6px' : '8px';
    };

    const widthAndHeight = getWidthAndHeight();

    const chooseColor = () => {
      props.onChange(color.rgbaColor);
    };

    return (
      <div
        key={color.rgbaColor}
        className='EnclosingCircle'
        onClick={chooseColor}
        data-testid={'colorDot ' + color.rgbaColor}
      >
        <div
          style={{
            background: color.rgbaColor,
            width: widthAndHeight,
            height: widthAndHeight,
            cursor: 'pointer',
            border: hasOutline ? border : undefined,
          }}
          className='ColorDot'
        />
      </div>
    );
  };

  return (
    <div className='ColorPicker'>
      {props.availableColors.map((color) => ColorDot(color))}
    </div>
  );
};

export default ColorPickerPill;
