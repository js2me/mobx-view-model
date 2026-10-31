import type { DevtoolsPosition } from '../devtools-config';

export const WINDOW_MARGIN = 12;
export interface Point {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}
export interface WindowRect extends Point, Size {}
export type ResizeEdge =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';
export const getViewport = (): Size => ({
  width: window.innerWidth,
  height: window.innerHeight,
});
export const readRect = (element: HTMLElement): WindowRect => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
};
export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, Math.min(min, max)), Math.max(0, max));

export function constrainRect(rect: WindowRect, viewport: Size): WindowRect {
  const width = Math.min(
    rect.width,
    Math.max(0, viewport.width - WINDOW_MARGIN * 2),
  );
  const height = Math.min(
    rect.height,
    Math.max(0, viewport.height - WINDOW_MARGIN * 2),
  );
  return {
    width,
    height,
    x: clamp(rect.x, WINDOW_MARGIN, viewport.width - width - WINDOW_MARGIN),
    y: clamp(rect.y, WINDOW_MARGIN, viewport.height - height - WINDOW_MARGIN),
  };
}

export function resizeRect(
  rect: WindowRect,
  edge: ResizeEdge,
  delta: Point,
  viewport: Size,
): WindowRect {
  const left = edge.includes('left');
  const right = edge.includes('right');
  const top = edge.includes('top');
  const bottom = edge.includes('bottom');
  const width =
    left || right
      ? clamp(
          rect.width + (left ? -delta.x : delta.x),
          325,
          viewport.width - WINDOW_MARGIN * 2,
        )
      : rect.width;
  const height =
    top || bottom
      ? clamp(
          rect.height + (top ? -delta.y : delta.y),
          250,
          viewport.height - WINDOW_MARGIN * 2,
        )
      : rect.height;
  return constrainRect(
    {
      width,
      height,
      x: left ? rect.x + rect.width - width : rect.x,
      y: top ? rect.y + rect.height - height : rect.y,
    },
    viewport,
  );
}

export function getDockPosition(
  point: Point,
  viewport: Size,
): DevtoolsPosition {
  return `${point.y < viewport.height / 2 ? 'top' : 'bottom'}-${point.x < viewport.width / 2 ? 'left' : 'right'}`;
}

export function applyRect(element: HTMLElement, rect: WindowRect) {
  Object.assign(element.style, {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    maxWidth: 'none',
    maxHeight: 'none',
  });
}
