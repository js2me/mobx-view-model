import {
  type KeyboardHandlerAction,
  KeyboardHandler as KeyboardHandlerLib,
} from 'mobx-swiss-knife';
import type { ViewModelDevtools } from './view-model-devtools';

export class KeyboardHandler extends KeyboardHandlerLib<KeyboardHandlerAction> {
  constructor(devtools: ViewModelDevtools) {
    const bind = (
      shortcuts: string[],
      command: (event: KeyboardEvent) => void,
    ): KeyboardHandlerAction => ({
      shortcuts,
      action: (event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('[data-ignore-global-keys]')
        )
          return;
        command(event);
      },
    });
    const scroll = (distance: number, event: KeyboardEvent) => {
      if (!devtools.window.isOpened) return;
      devtools.inspector.viewport?.scrollBy(distance);
      if (
        devtools.window.isOpened &&
        devtools.inspector.search.isSearchInputFocused
      ) {
        event.stopPropagation();
        event.preventDefault();
      }
    };
    super({
      actions: [
        bind(['Ctrl+F12', 'Meta+F12'], devtools.window.toggle),
        bind(['Escape'], devtools.window.hide),
        bind(['Ctrl+ArrowLeft'], () => devtools.inspector.collapseAll()),
        bind(['Ctrl+ArrowRight'], () => devtools.inspector.expandAll()),
        bind(['Tab'], (event) => {
          if (
            devtools.window.isOpened &&
            devtools.inspector.search.isSearchInputFocused
          )
            event.preventDefault();
        }),
        bind(['Ctrl+ArrowDown', 'PageDown'], (event) => scroll(400, event)),
        bind(['Ctrl+ArrowUp', 'PageUp'], (event) => scroll(-400, event)),
      ],
    });
  }
}
