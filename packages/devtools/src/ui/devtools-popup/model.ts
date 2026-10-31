import { action, makeObservable, observable } from 'mobx';
import { createRef } from 'yummies/mobx';
import { ViewModelImpl } from '@/model/lib/view-model.impl';
import {
  getViewport,
  type ResizeEdge,
  readRect,
  type WindowRect,
} from '@/model/window/geometry';
import { MouseGesture } from '@/model/window/mouse-gesture';
import type { DevtoolsClientVM } from '../devtools-client/model';

export class VmDevtoolsPopupVM extends ViewModelImpl<{}, DevtoolsClientVM> {
  readonly devtools = this.parentViewModel.devtools;
  private startRect?: WindowRect;
  private resizeEdge: ResizeEdge | null = null;
  mode: 'dragging' | 'resizing' | null = null;
  gesture!: MouseGesture;
  readonly contentRef = createRef<HTMLDivElement>({
    onSet: this.attach.bind(this),
  });

  willMount() {
    makeObservable(this, {
      mode: observable.ref,
      handleMouseDown: action.bound,
    });
    this.gesture = new MouseGesture(
      {
        start: (event) => {
          const node = this.contentRef.current;
          if (!node) return false;
          const path = event
            .composedPath()
            .filter(
              (target): target is HTMLElement => target instanceof HTMLElement,
            );
          const handle = path.find((target) => target.dataset.resizeHandle);
          if (
            !handle &&
            (!path.some((target) =>
              target.hasAttribute('data-content-header'),
            ) ||
              path.some((target) => target.hasAttribute('data-no-drag')))
          )
            return false;
          event.preventDefault();
          this.resizeEdge =
            (handle?.dataset.resizeHandle as ResizeEdge | undefined) ?? null;
          this.mode = handle ? 'resizing' : 'dragging';
          this.startRect = readRect(node);
          return true;
        },
        move: (delta) => {
          const node = this.contentRef.current;
          if (!node || !this.startRect) return;
          const layout = this.devtools.window.layout;
          if (this.resizeEdge)
            layout.resize(node, this.startRect, this.resizeEdge, delta);
          else layout.move(node, this.startRect, delta);
        },
        end: action(() => {
          this.mode = null;
        }),
      },
      this.unmountSignal,
    );
  }

  handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    this.gesture.begin(event.nativeEvent);
  }
  private attach(node: HTMLDivElement) {
    this.devtools.window.layout.restore(node);
    let previousViewport = getViewport();
    window.addEventListener(
      'resize',
      () => {
        this.devtools.window.layout.fitViewport(node, previousViewport);
        previousViewport = getViewport();
      },
      { signal: this.unmountSignal },
    );
  }
}
