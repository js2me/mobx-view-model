import { clamp } from 'lodash-es';
import { runInAction } from 'mobx';
import { Storage } from 'mobx-swiss-knife';
import { ViewModelBase } from 'mobx-view-model';
import { createRef } from 'yummies/mobx';
import type { Defined, Maybe } from 'yummies/types';
import type { ViewModelDevtoolsConfig } from '@/model';
import type { DevtoolsClientVM } from '../devtools-client/model';
import { VmDevtoolsPopupVM } from '../devtools-popup/model';
import css from './styles.module.css';

type EdgeAnchors = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

const EDGE_MARGIN = 12;

export class VmDevtoolsButtonVM extends ViewModelBase<{}, DevtoolsClientVM> {
  devtools = this.parentViewModel.devtools;

  private storage = new Storage({
    namespace: 'mobx-view-model-devtools',
    prefix: 'devtools-button',
    type: 'local',
  });

  private rect: Maybe<DOMRect> = null;

  ref = createRef<HTMLButtonElement>({
    onSet: (node) => {
      const dragState = {
        isDragging: false,
        offsetX: 0,
        offsetY: 0,
        hasMoved: false,
        startX: 0,
        startY: 0,
      };

      const applyPosition = (x: number, y: number) => {
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.bottom = 'auto';
        node.style.right = 'auto';
      };

      const savedLeft = this.storage.get({ key: 'left', fallback: '' });
      const savedTop = this.storage.get({ key: 'top', fallback: '' });

      const { x, y } = this.fixPosition(savedLeft, savedTop);
      applyPosition(x, y);
      this.rect = node.getBoundingClientRect();
      this.saveAnchors(
        this.detectAnchors(x, y, {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      );

      node.addEventListener(
        'mousedown',
        (e: MouseEvent) => {
          dragState.isDragging = true;
          dragState.hasMoved = false;

          const rect = node.getBoundingClientRect();
          dragState.offsetX = rect.left - e.clientX;
          dragState.offsetY = rect.top - e.clientY;
          dragState.startX = rect.left;
          dragState.startY = rect.top;

          node.classList.add(css.dragging);
        },
        { signal: this.unmountSignal },
      );

      const handleMouseMove = (e: MouseEvent) => {
        if (!dragState.isDragging) return;

        const { x, y } = this.fixPosition(
          e.clientX + dragState.offsetX,
          e.clientY + dragState.offsetY,
        );

        applyPosition(x, y);
        VmDevtoolsPopupVM.lastX = null;

        if (x !== dragState.startX || y !== dragState.startY) {
          dragState.hasMoved = true;
        }
      };

      const handleStopDragging = () => {
        dragState.isDragging = false;
        node.classList.remove(css.dragging);

        this.storage.set({ key: 'left', value: node.style.left });
        this.storage.set({ key: 'top', value: node.style.top });
        this.rect = node.getBoundingClientRect();
        this.saveAnchors(
          this.detectAnchors(
            +node.style.left.replace('px', '') || 0,
            +node.style.top.replace('px', '') || 0,
            {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          ),
        );
        if (this.position !== this.devtools.position) {
          runInAction(() => {
            this.devtools.position = this.position;
          });
        }
      };

      node.addEventListener(
        'click',
        (e: MouseEvent) => {
          if (dragState.hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          this.handleClick();
        },
        { signal: this.unmountSignal },
      );

      document.addEventListener('mousemove', handleMouseMove, {
        signal: this.unmountSignal,
      });
      document.addEventListener('mouseup', handleStopDragging, {
        signal: this.unmountSignal,
      });
      window.addEventListener('blur', handleStopDragging, {
        signal: this.unmountSignal,
      });

      let prevViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      const handleResize = () => {
        node.classList.add(css.dragging);

        const rect = node.getBoundingClientRect();
        this.rect = rect;

        const anchors = this.loadAnchors({
          x: rect.left,
          y: rect.top,
          viewport: prevViewport,
        });

        const { x, y } = this.fixPositionOnResize(rect.left, rect.top, anchors);

        prevViewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        applyPosition(x, y);
        node.classList.remove(css.dragging);

        this.storage.set({ key: 'left', value: node.style.left });
        this.storage.set({ key: 'top', value: node.style.top });

        if (this.position !== this.devtools.position) {
          runInAction(() => {
            this.devtools.position = this.position;
          });
        }
      };

      window.addEventListener('resize', handleResize, {
        signal: this.unmountSignal,
      });
    },
  });

  handleClick = () => {
    if (this.devtools.isPopupOpened) {
      this.devtools.hidePopup();
    } else {
      this.devtools.showPopup();
    }
  };

  private get position(): Defined<ViewModelDevtoolsConfig['position']> {
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

  private get offsets() {
    this.rect = this.ref.current?.getBoundingClientRect();

    return {
      left: this.rect?.left ?? 0,
      top: this.rect?.top ?? 0,
    };
  }

  private get size() {
    if (!this.rect && this.ref.current) {
      this.rect = this.ref.current.getBoundingClientRect();
    }

    return {
      width: this.rect?.width ?? 0,
      height: this.rect?.height ?? 0,
    };
  }

  private fixPosition(
    rawX: Maybe<number | string>,
    rawY: Maybe<number | string>,
  ) {
    const maxX = window.innerWidth - this.size.width - EDGE_MARGIN;
    const maxY = window.innerHeight - this.size.height - EDGE_MARGIN;

    const x = typeof rawX === 'string' ? +rawX.replace('px', '') : rawX;
    const y = typeof rawY === 'string' ? +rawY.replace('px', '') : rawY;

    return {
      x: clamp(x || 0, EDGE_MARGIN, maxX),
      y: clamp(y || 0, EDGE_MARGIN, maxY),
    };
  }

  private detectAnchors(
    x: number,
    y: number,
    viewport: { width: number; height: number },
  ): EdgeAnchors {
    const { width, height } = this.size;
    const maxX = viewport.width - width - EDGE_MARGIN;
    const maxY = viewport.height - height - EDGE_MARGIN;

    return {
      left: x <= EDGE_MARGIN + 1,
      right: x >= maxX - 1,
      top: y <= EDGE_MARGIN + 1,
      bottom: y >= maxY - 1,
    };
  }

  private saveAnchors(anchors: EdgeAnchors) {
    this.storage.set({ key: 'anchors', value: JSON.stringify(anchors) });
  }

  private loadAnchors(fallback?: {
    x: number;
    y: number;
    viewport: { width: number; height: number };
  }): EdgeAnchors {
    const raw = this.storage.get({ key: 'anchors', fallback: '' });

    if (raw) {
      return JSON.parse(raw) as EdgeAnchors;
    }

    if (fallback) {
      const anchors = this.detectAnchors(
        fallback.x,
        fallback.y,
        fallback.viewport,
      );
      this.saveAnchors(anchors);
      return anchors;
    }

    return { left: false, right: false, top: false, bottom: false };
  }

  private fixPositionOnResize(x: number, y: number, anchors: EdgeAnchors) {
    const { width, height } = this.size;
    const maxX = window.innerWidth - width - EDGE_MARGIN;
    const maxY = window.innerHeight - height - EDGE_MARGIN;

    return {
      x: anchors.right
        ? maxX
        : anchors.left
          ? EDGE_MARGIN
          : clamp(x, EDGE_MARGIN, maxX),
      y: anchors.bottom
        ? maxY
        : anchors.top
          ? EDGE_MARGIN
          : clamp(y, EDGE_MARGIN, maxY),
    };
  }
}
