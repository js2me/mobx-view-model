import {
  applyRect,
  constrainRect,
  getViewport,
  type Point,
  type ResizeEdge,
  resizeRect,
  type Size,
  WINDOW_MARGIN,
  type WindowRect,
} from './geometry';

export class PopupLayout {
  private bounds: WindowRect | null = null;
  private widthAnchor: 'left' | 'right' | null = null;
  private heightAnchor: 'top' | 'bottom' | null = null;

  restore(element: HTMLElement) {
    if (this.bounds) {
      this.bounds = constrainRect(this.bounds, getViewport());
      applyRect(element, this.bounds);
    }
  }
  resetPosition() {
    this.bounds = null;
    this.widthAnchor = null;
    this.heightAnchor = null;
  }
  move(element: HTMLElement, start: WindowRect, delta: Point) {
    this.widthAnchor = null;
    this.heightAnchor = null;
    this.bounds = constrainRect(
      { ...start, x: start.x + delta.x, y: start.y + delta.y },
      getViewport(),
    );
    applyRect(element, this.bounds);
  }
  resize(
    element: HTMLElement,
    start: WindowRect,
    edge: ResizeEdge,
    delta: Point,
  ) {
    this.bounds = resizeRect(start, edge, delta, getViewport());
    if (edge.includes('left') || edge.includes('right'))
      this.widthAnchor = edge.includes('left') ? 'right' : 'left';
    if (edge.includes('top') || edge.includes('bottom'))
      this.heightAnchor = edge.includes('top') ? 'bottom' : 'top';
    applyRect(element, this.bounds);
  }
  fitViewport(element: HTMLElement, previousViewport: Size) {
    if (!this.bounds) return;
    const viewport = getViewport();
    const previous = this.bounds;
    const bounds = constrainRect(previous, viewport);
    const pinnedRight =
      this.widthAnchor === 'right' ||
      (this.widthAnchor === null &&
        previous.x >=
          previousViewport.width - previous.width - WINDOW_MARGIN - 1);
    const pinnedBottom =
      this.heightAnchor === 'bottom' ||
      (this.heightAnchor === null &&
        previous.y >=
          previousViewport.height - previous.height - WINDOW_MARGIN - 1);
    if (pinnedRight) bounds.x = viewport.width - bounds.width - WINDOW_MARGIN;
    if (pinnedBottom)
      bounds.y = viewport.height - bounds.height - WINDOW_MARGIN;
    this.bounds = bounds;
    applyRect(element, bounds);
  }
}
