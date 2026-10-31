import { action, makeObservable, observable } from 'mobx';
import type { Point } from './geometry';

export interface MouseGestureOptions {
  start(event: MouseEvent): boolean;
  move(delta: Point): void;
  end?(): void;
}

/** One mouse interaction, cancelled by release, focus loss, or owner disposal. */
export class MouseGesture {
  isActive = false;
  hasMoved = false;
  private origin: Point = { x: 0, y: 0 };
  constructor(
    private readonly options: MouseGestureOptions,
    signal: AbortSignal,
  ) {
    makeObservable<this, 'move'>(this, {
      isActive: observable.ref,
      hasMoved: observable.ref,
      begin: action.bound,
      move: action.bound,
      end: action.bound,
    });
    document.addEventListener('mousemove', this.move, { signal });
    document.addEventListener('mouseup', this.end, { signal });
    window.addEventListener('blur', this.end, { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.end();
      },
      { signal },
    );
    signal.addEventListener('abort', this.end, { once: true });
  }
  begin(event: MouseEvent) {
    if (event.button !== 0 || !this.options.start(event)) return;
    this.origin = { x: event.clientX, y: event.clientY };
    this.isActive = true;
    this.hasMoved = false;
  }
  private move(event: MouseEvent) {
    if (!this.isActive) return;
    const delta = {
      x: event.clientX - this.origin.x,
      y: event.clientY - this.origin.y,
    };
    if (delta.x || delta.y) this.hasMoved = true;
    this.options.move(delta);
  }
  end() {
    if (!this.isActive) return;
    this.isActive = false;
    this.options.end?.();
  }
}
