import { clamp } from 'lodash-es';
import { reaction } from 'mobx';
import { pageVisibility } from 'mobx-web-api';
import { createRef } from 'yummies/mobx';
import type { Defined, Maybe } from 'yummies/types';
import { type ViewModelDevtoolsConfig, ViewModelImpl } from '@/model';
import type { DevtoolsClientVM } from '../devtools-client/model';
import css from './styles.module.css';

const EDGE_MARGIN = 12;
const MIN_POPUP_WIDTH = 325;
const MIN_POPUP_HEIGHT = 250;

type HorizontalResizeEdge = 'left' | 'right';
type VerticalResizeEdge = 'top' | 'bottom';
type CornerResizeEdge =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';
type ResizeEdge =
  | HorizontalResizeEdge
  | VerticalResizeEdge
  | CornerResizeEdge;

export class VmDevtoolsPopupVM extends ViewModelImpl<{}, DevtoolsClientVM> {
  devtools = this.parentViewModel.devtools;

  static lastX: number | null = null;
  static lastY: number | null = null;
  static lastWidth: number | null = null;
  static lastHeight: number | null = null;
  static widthAnchor: HorizontalResizeEdge | null = null;
  static heightAnchor: VerticalResizeEdge | null = null;

  dragState = {
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    hasMoved: false,
    startX: 0,
    startY: 0,
  };

  resizeState = {
    isResizing: false,
    edge: null as Maybe<ResizeEdge>,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0,
  };

  private rect: Maybe<DOMRect> = null;

  contentRef = createRef<HTMLDivElement>({
    onSet: (node) => {
      this.applyStoredLayout(node);

      node.addEventListener(
        'mousedown',
        (e: MouseEvent) => {
          const path = e.composedPath();
          const resizeHandle = path.find(
            (it) => (it as HTMLElement).dataset?.resizeHandle,
          ) as Maybe<HTMLElement>;

          if (resizeHandle?.dataset.resizeHandle) {
            e.preventDefault();

            this.syncInlineLayout(node);

            const rect = node.getBoundingClientRect();
            this.resizeState.isResizing = true;
            this.resizeState.edge = resizeHandle.dataset
              .resizeHandle as ResizeEdge;
            this.resizeState.startX = e.clientX;
            this.resizeState.startY = e.clientY;
            this.resizeState.startWidth = rect.width;
            this.resizeState.startHeight = rect.height;
            this.resizeState.startLeft = rect.left;
            this.resizeState.startTop = rect.top;

            node.classList.add(css.resizing);
            return;
          }

          const isDragOnContentHeader = path.some(
            (it) => (it as HTMLElement).dataset?.contentHeader,
          );
          const isNoDragTarget = path.some(
            (it) => (it as HTMLElement).dataset?.noDrag,
          );

          if (!isDragOnContentHeader || isNoDragTarget) {
            return;
          }

          this.syncInlineLayout(node);

          VmDevtoolsPopupVM.widthAnchor = null;
          VmDevtoolsPopupVM.heightAnchor = null;

          this.dragState.isDragging = true;
          this.dragState.hasMoved = false;

          const rect = node.getBoundingClientRect();
          this.dragState.offsetX = rect.left - e.clientX;
          this.dragState.offsetY = rect.top - e.clientY;
          this.dragState.startX = rect.left;
          this.dragState.startY = rect.top;

          node.classList.add(css.dragging);
        },
        { signal: this.unmountSignal },
      );

      const handleMouseMove = (e: MouseEvent) => {
        if (this.resizeState.isResizing) {
          this.handleEdgeResize(node, e);
          return;
        }

        if (!this.dragState.isDragging) return;

        const x = this.fixX(e.clientX + this.dragState.offsetX);
        const y = this.fixY(e.clientY + this.dragState.offsetY);

        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.right = 'auto';
        node.style.bottom = 'auto';

        VmDevtoolsPopupVM.lastX = x;
        VmDevtoolsPopupVM.lastY = y;

        if (x !== this.dragState.startX || y !== this.dragState.startY) {
          this.dragState.hasMoved = true;
        }
      };

      const handleStopDragging = () => {
        this.dragState.isDragging = false;
        node.classList.remove(css.dragging);
        this.dragState.hasMoved = false;
      };

      const handleStopResizing = () => {
        this.resizeState.isResizing = false;
        this.resizeState.edge = null;
        node.classList.remove(css.resizing);
      };

      const handleMouseUp = () => {
        handleStopDragging();
        handleStopResizing();
      };

      reaction(
        () => pageVisibility.isHidden,
        (isHiddenPage) => {
          if (isHiddenPage) {
            handleMouseUp();
          }
        },
        {
          signal: this.unmountSignal,
        },
      );

      document.addEventListener('mousemove', handleMouseMove, {
        signal: this.unmountSignal,
      });
      document.addEventListener('mouseup', handleMouseUp, {
        signal: this.unmountSignal,
      });
      window.addEventListener('blur', handleMouseUp, {
        signal: this.unmountSignal,
      });

      let prevViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      const handleWindowResize = () => {
        node.classList.add(css.resizing);
        this.rect = node.getBoundingClientRect();

        if (VmDevtoolsPopupVM.lastWidth !== null) {
          const width = this.fixWidth(VmDevtoolsPopupVM.lastWidth);
          node.style.width = `${width}px`;
          node.style.maxWidth = 'none';
          VmDevtoolsPopupVM.lastWidth = width;
        }

        if (VmDevtoolsPopupVM.lastHeight !== null) {
          const height = this.fixHeight(VmDevtoolsPopupVM.lastHeight);
          node.style.height = `${height}px`;
          node.style.maxHeight = 'none';
          VmDevtoolsPopupVM.lastHeight = height;
        }

        if (VmDevtoolsPopupVM.lastX !== null) {
          const x = this.fixXOnWindowResize(
            VmDevtoolsPopupVM.lastX,
            prevViewport.width,
          );

          node.style.left = `${x}px`;
          node.style.right = 'auto';
          VmDevtoolsPopupVM.lastX = x;
        }

        if (VmDevtoolsPopupVM.lastY !== null) {
          const y = this.fixYOnWindowResize(
            VmDevtoolsPopupVM.lastY,
            prevViewport.height,
          );

          node.style.top = `${y}px`;
          node.style.bottom = 'auto';
          VmDevtoolsPopupVM.lastY = y;
        }

        prevViewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        node.classList.remove(css.resizing);
      };

      window.addEventListener('resize', handleWindowResize, {
        signal: this.unmountSignal,
      });
    },
  });

  get position(): Defined<ViewModelDevtoolsConfig['position']> {
    const { left, top } = this.offsets;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const isLeft = left < centerX;
    const isTop = top < centerY;

    if (isTop && isLeft) return 'top-left';
    if (isTop && !isLeft) return 'top-right';
    if (!isTop && isLeft) return 'bottom-left';

    return 'bottom-right';
  }

  private handleEdgeResize(node: HTMLDivElement, e: MouseEvent) {
    const edge = this.resizeState.edge;

    if (
      edge === 'top-left' ||
      edge === 'top-right' ||
      edge === 'bottom-left' ||
      edge === 'bottom-right'
    ) {
      this.handleCornerResize(node, e, edge);
      return;
    }

    if (edge === 'left' || edge === 'right') {
      this.handleWidthResize(node, e, edge);
      return;
    }

    if (edge === 'top' || edge === 'bottom') {
      this.handleHeightResize(node, e, edge);
    }
  }

  private handleCornerResize(
    node: HTMLDivElement,
    e: MouseEvent,
    corner: CornerResizeEdge,
  ) {
    const deltaX = e.clientX - this.resizeState.startX;
    const deltaY = e.clientY - this.resizeState.startY;

    switch (corner) {
      case 'bottom-right': {
        const width = this.fixWidth(this.resizeState.startWidth + deltaX);
        const height = this.fixHeight(this.resizeState.startHeight + deltaY);

        this.applyPopupSize(node, width, height);
        VmDevtoolsPopupVM.widthAnchor = 'left';
        VmDevtoolsPopupVM.heightAnchor = 'top';
        this.clampPopupPosition(node);
        break;
      }
      case 'bottom-left': {
        const width = this.fixWidth(this.resizeState.startWidth - deltaX);
        const height = this.fixHeight(this.resizeState.startHeight + deltaY);
        const left =
          this.resizeState.startLeft + (this.resizeState.startWidth - width);

        this.applyPopupSize(node, width, height);
        VmDevtoolsPopupVM.widthAnchor = 'right';
        VmDevtoolsPopupVM.heightAnchor = 'top';
        this.applyPopupPosition(node, left, VmDevtoolsPopupVM.lastY);
        break;
      }
      case 'top-right': {
        const width = this.fixWidth(this.resizeState.startWidth + deltaX);
        const height = this.fixHeight(this.resizeState.startHeight - deltaY);
        const top =
          this.resizeState.startTop + (this.resizeState.startHeight - height);

        this.applyPopupSize(node, width, height);
        VmDevtoolsPopupVM.widthAnchor = 'left';
        VmDevtoolsPopupVM.heightAnchor = 'bottom';
        this.applyPopupPosition(node, VmDevtoolsPopupVM.lastX, top);
        break;
      }
      case 'top-left': {
        const width = this.fixWidth(this.resizeState.startWidth - deltaX);
        const height = this.fixHeight(this.resizeState.startHeight - deltaY);
        const left =
          this.resizeState.startLeft + (this.resizeState.startWidth - width);
        const top =
          this.resizeState.startTop + (this.resizeState.startHeight - height);

        this.applyPopupSize(node, width, height);
        VmDevtoolsPopupVM.widthAnchor = 'right';
        VmDevtoolsPopupVM.heightAnchor = 'bottom';
        this.applyPopupPosition(node, left, top);
        break;
      }
    }
  }

  private applyPopupSize(node: HTMLDivElement, width: number, height: number) {
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
    node.style.maxWidth = 'none';
    node.style.maxHeight = 'none';

    this.rect = node.getBoundingClientRect();

    VmDevtoolsPopupVM.lastWidth = width;
    VmDevtoolsPopupVM.lastHeight = height;
  }

  private applyPopupPosition(
    node: HTMLDivElement,
    rawX: Maybe<number>,
    rawY: Maybe<number>,
  ) {
    if (rawX !== null) {
      const x = this.fixX(rawX);
      node.style.left = `${x}px`;
      node.style.right = 'auto';
      VmDevtoolsPopupVM.lastX = x;
    }

    if (rawY !== null) {
      const y = this.fixY(rawY);
      node.style.top = `${y}px`;
      node.style.bottom = 'auto';
      VmDevtoolsPopupVM.lastY = y;
    }
  }

  private clampPopupPosition(node: HTMLDivElement) {
    this.applyPopupPosition(
      node,
      VmDevtoolsPopupVM.lastX,
      VmDevtoolsPopupVM.lastY,
    );
  }

  private handleWidthResize(
    node: HTMLDivElement,
    e: MouseEvent,
    edge: HorizontalResizeEdge,
  ) {
    const deltaX = e.clientX - this.resizeState.startX;

    if (edge === 'right') {
      const width = this.fixWidth(this.resizeState.startWidth + deltaX);

      node.style.width = `${width}px`;
      node.style.maxWidth = 'none';
      VmDevtoolsPopupVM.lastWidth = width;
      VmDevtoolsPopupVM.widthAnchor = 'left';

      if (VmDevtoolsPopupVM.lastX !== null) {
        const x = this.fixX(VmDevtoolsPopupVM.lastX);
        node.style.left = `${x}px`;
        VmDevtoolsPopupVM.lastX = x;
      }

      return;
    }

    const width = this.fixWidth(this.resizeState.startWidth - deltaX);
    const left =
      this.resizeState.startLeft + (this.resizeState.startWidth - width);
    const x = this.fixX(left);

    node.style.left = `${x}px`;
    node.style.right = 'auto';
    node.style.width = `${width}px`;
    node.style.maxWidth = 'none';
    VmDevtoolsPopupVM.lastX = x;
    VmDevtoolsPopupVM.lastWidth = width;
    VmDevtoolsPopupVM.widthAnchor = 'right';
  }

  private handleHeightResize(
    node: HTMLDivElement,
    e: MouseEvent,
    edge: VerticalResizeEdge,
  ) {
    const deltaY = e.clientY - this.resizeState.startY;

    if (edge === 'bottom') {
      const height = this.fixHeight(this.resizeState.startHeight + deltaY);

      node.style.height = `${height}px`;
      node.style.maxHeight = 'none';
      VmDevtoolsPopupVM.lastHeight = height;
      VmDevtoolsPopupVM.heightAnchor = 'top';

      if (VmDevtoolsPopupVM.lastY !== null) {
        const y = this.fixY(VmDevtoolsPopupVM.lastY);
        node.style.top = `${y}px`;
        node.style.bottom = 'auto';
        VmDevtoolsPopupVM.lastY = y;
      }

      return;
    }

    const height = this.fixHeight(this.resizeState.startHeight - deltaY);
    const top =
      this.resizeState.startTop + (this.resizeState.startHeight - height);
    const y = this.fixY(top);

    node.style.top = `${y}px`;
    node.style.bottom = 'auto';
    node.style.height = `${height}px`;
    node.style.maxHeight = 'none';
    VmDevtoolsPopupVM.lastY = y;
    VmDevtoolsPopupVM.lastHeight = height;
    VmDevtoolsPopupVM.heightAnchor = 'bottom';
  }

  private applyStoredLayout(node: HTMLDivElement) {
    if (VmDevtoolsPopupVM.lastWidth !== null) {
      node.style.width = `${this.fixWidth(VmDevtoolsPopupVM.lastWidth)}px`;
      node.style.maxWidth = 'none';
    }

    if (VmDevtoolsPopupVM.lastHeight !== null) {
      node.style.height = `${this.fixHeight(VmDevtoolsPopupVM.lastHeight)}px`;
      node.style.maxHeight = 'none';
    }

    if (VmDevtoolsPopupVM.lastX !== null) {
      node.style.left = `${this.fixX(VmDevtoolsPopupVM.lastX)}px`;
      node.style.right = 'auto';
    }

    if (VmDevtoolsPopupVM.lastY !== null) {
      node.style.top = `${this.fixY(VmDevtoolsPopupVM.lastY)}px`;
      node.style.bottom = 'auto';
    }
  }

  private syncInlineLayout(node: HTMLDivElement) {
    const rect = node.getBoundingClientRect();

    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
    node.style.right = 'auto';
    node.style.bottom = 'auto';
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;
    node.style.maxWidth = 'none';
    node.style.maxHeight = 'none';

    VmDevtoolsPopupVM.lastX = rect.left;
    VmDevtoolsPopupVM.lastY = rect.top;
    VmDevtoolsPopupVM.lastWidth = rect.width;
    VmDevtoolsPopupVM.lastHeight = rect.height;
  }

  private get offsets() {
    this.rect = this.contentRef.current?.getBoundingClientRect();

    return {
      left: this.rect?.left ?? 0,
      top: this.rect?.top ?? 0,
    };
  }

  private get size() {
    if (!this.rect && this.contentRef.current) {
      this.rect = this.contentRef.current.getBoundingClientRect();
    }

    return {
      width: this.rect?.width ?? 0,
      height: this.rect?.height ?? 0,
    };
  }

  private fixWidth(rawWidth: number) {
    const maxWidth = window.innerWidth - EDGE_MARGIN * 2;

    return clamp(rawWidth, MIN_POPUP_WIDTH, maxWidth);
  }

  private fixHeight(rawHeight: number) {
    const maxHeight = window.innerHeight - EDGE_MARGIN * 2;

    return clamp(rawHeight, MIN_POPUP_HEIGHT, maxHeight);
  }

  private fixX(rawX: Maybe<number | string>) {
    const maxX = window.innerWidth - this.size.width - EDGE_MARGIN;

    const x = typeof rawX === 'string' ? +rawX.replace('px', '') : rawX;

    return clamp(x || 0, EDGE_MARGIN, maxX);
  }

  private fixY(rawY: Maybe<number | string>) {
    const maxY = window.innerHeight - this.size.height - EDGE_MARGIN;

    const y = typeof rawY === 'string' ? +rawY.replace('px', '') : rawY;

    return clamp(y || 0, EDGE_MARGIN, maxY);
  }

  private fixXOnWindowResize(x: number, prevViewportWidth: number) {
    const { width } = this.size;
    const minX = EDGE_MARGIN;
    const prevMaxX = prevViewportWidth - width - EDGE_MARGIN;
    const maxX = window.innerWidth - width - EDGE_MARGIN;

    if (VmDevtoolsPopupVM.widthAnchor === 'left') {
      return clamp(x, minX, maxX);
    }

    if (VmDevtoolsPopupVM.widthAnchor === 'right') {
      return maxX;
    }

    const pinRight = x >= prevMaxX - 1;
    const pinLeft = x <= minX + 1;

    if (pinRight) return maxX;
    if (pinLeft) return minX;

    return clamp(x, minX, maxX);
  }

  private fixYOnWindowResize(y: number, prevViewportHeight: number) {
    const { height } = this.size;
    const minY = EDGE_MARGIN;
    const prevMaxY = prevViewportHeight - height - EDGE_MARGIN;
    const maxY = window.innerHeight - height - EDGE_MARGIN;

    if (VmDevtoolsPopupVM.heightAnchor === 'top') {
      return clamp(y, minY, maxY);
    }

    if (VmDevtoolsPopupVM.heightAnchor === 'bottom') {
      return maxY;
    }

    const pinBottom = y >= prevMaxY - 1;
    const pinTop = y <= minY + 1;

    if (pinBottom) return maxY;
    if (pinTop) return minY;

    return clamp(y, minY, maxY);
  }
}
