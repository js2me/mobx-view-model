import { Storage } from 'mobx-swiss-knife';
import { createRef } from 'yummies/mobx';
import { ViewModelImpl } from '@/model/lib/view-model.impl';
import {
  constrainRect,
  getDockPosition,
  getViewport,
  readRect,
  WINDOW_MARGIN,
  type WindowRect,
} from '@/model/window/geometry';
import { MouseGesture } from '@/model/window/mouse-gesture';
import type { DevtoolsClientVM } from '../devtools-client/model';

export class VmDevtoolsButtonVM extends ViewModelImpl<{}, DevtoolsClientVM> {
  readonly devtools = this.parentViewModel.devtools;
  private readonly storage = new Storage({
    namespace: 'mobx-view-model-devtools',
    prefix: 'devtools-button',
    type: 'local',
  });
  private bounds?: WindowRect;
  private pinnedRight = false;
  private pinnedBottom = false;
  gesture!: MouseGesture;
  readonly ref = createRef<HTMLButtonElement>({
    onSet: this.attach.bind(this),
  });

  willMount() {
    this.gesture = new MouseGesture(
      {
        start: () => {
          const node = this.ref.current;
          if (!node) return false;
          this.bounds = readRect(node);
          return true;
        },
        move: (delta) => {
          const node = this.ref.current;
          if (!node || !this.bounds) return;
          this.apply(
            node,
            constrainRect(
              {
                ...this.bounds,
                x: this.bounds.x + delta.x,
                y: this.bounds.y + delta.y,
              },
              getViewport(),
            ),
          );
          this.devtools.window.layout.resetPosition();
        },
        end: () => {
          const node = this.ref.current;
          if (node) this.save(node);
        },
      },
      this.unmountSignal,
    );
  }
  handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) =>
    this.gesture.begin(event.nativeEvent);
  handleClick = () => {
    if (!this.gesture.hasMoved) this.devtools.window.toggle();
  };

  private attach(node: HTMLButtonElement) {
    const rect = readRect(node);
    const left = this.storage.get<string>({ key: 'left' });
    const top = this.storage.get<string>({ key: 'top' });
    const initial = constrainRect(
      {
        ...rect,
        x: left ? parseFloat(left) : rect.x,
        y: top ? parseFloat(top) : rect.y,
      },
      getViewport(),
    );
    this.apply(node, initial);
    this.updatePins(initial);
    window.addEventListener(
      'resize',
      () => {
        const rect = constrainRect(readRect(node), getViewport());
        if (this.pinnedRight)
          rect.x = window.innerWidth - rect.width - WINDOW_MARGIN;
        if (this.pinnedBottom)
          rect.y = window.innerHeight - rect.height - WINDOW_MARGIN;
        this.apply(node, rect);
        this.save(node);
      },
      { signal: this.unmountSignal },
    );
  }
  private updatePins(rect: WindowRect) {
    this.pinnedRight =
      rect.x >= window.innerWidth - rect.width - WINDOW_MARGIN - 1;
    this.pinnedBottom =
      rect.y >= window.innerHeight - rect.height - WINDOW_MARGIN - 1;
  }
  private apply(node: HTMLButtonElement, rect: WindowRect) {
    Object.assign(node.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      right: 'auto',
      bottom: 'auto',
    });
  }
  private save(node: HTMLButtonElement) {
    const rect = readRect(node);
    this.storage.set({ key: 'left', value: `${rect.x}px` });
    this.storage.set({ key: 'top', value: `${rect.y}px` });
    this.updatePins(rect);
    this.devtools.settings.setPosition(getDockPosition(rect, getViewport()));
  }
}
