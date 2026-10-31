import {
  type KeyboardHandlerAction,
  KeyboardHandler as KeyboardHandlerLib,
} from 'mobx-swiss-knife';
import { typeGuard } from 'yummies/type-guard';
import type { ViewModelDevtools } from './view-model-devtools';

export class KeyboardHandler extends KeyboardHandlerLib<KeyboardHandlerAction> {
  constructor(devtools: ViewModelDevtools) {
    super({
      actions: [
        {
          shortcuts: ['Ctrl+F12', 'Meta+F12'],
          action: (e) => {
            if (
              typeGuard.isElement(e.target) &&
              e.target.dataset.ignoreGlobalKeys
            ) {
              return;
            }
            if (devtools.isPopupOpened) {
              devtools.hidePopup();
            } else {
              devtools.showPopup();
            }
          },
        },
        {
          shortcuts: ['Escape'],
          action: (e) => {
            if (
              typeGuard.isElement(e.target) &&
              e.target.dataset.ignoreGlobalKeys
            ) {
              return;
            }
            devtools.hidePopup();
          },
        },
        {
          shortcuts: ['Ctrl+ArrowLeft'],
          action: (e) => {
            if (
              typeGuard.isElement(e.target) &&
              e.target.dataset.ignoreGlobalKeys
            ) {
              return;
            }
            devtools.collapseAllVms();
          },
        },
        {
          shortcuts: ['Ctrl+ArrowRight'],
          action: (e) => {
            if (
              typeGuard.isElement(e.target) &&
              e.target.dataset.ignoreGlobalKeys
            ) {
              return;
            }
            devtools.expandAllVMs();
          },
        },
        {
          shortcuts: ['Tab'],
          action: (e) => {
            if (
              typeGuard.isElement(e.target) &&
              e.target.dataset.ignoreGlobalKeys
            ) {
              return;
            }
            if (devtools.searchEngine.searchInputRef.meta.focused) {
              e.preventDefault();
            }
          },
        },
        {
          shortcuts: ['Ctrl+ArrowDown', 'PageDown'],
          action: (e) => {
            if (
              typeGuard.isElement(e.target) &&
              e.target.dataset.ignoreGlobalKeys
            ) {
              return;
            }
            if (!devtools.scrollListRef.current) return;

            devtools.scrollListRef.current.scrollTo(
              devtools.scrollListRef.current.scrollOffset + 400,
            );

            if (devtools.searchEngine.searchInputRef.meta.focused) {
              e.stopPropagation();
              e.preventDefault();
            }
          },
        },
        {
          shortcuts: ['Ctrl+ArrowUp', 'PageUp'],
          action: (e) => {
            if (
              typeGuard.isElement(e.target) &&
              e.target.dataset.ignoreGlobalKeys
            ) {
              return;
            }
            if (!devtools.scrollListRef.current) return;

            devtools.scrollListRef.current.scrollTo(
              devtools.scrollListRef.current.scrollOffset - 400,
            );

            if (devtools.searchEngine.searchInputRef.meta.focused) {
              e.stopPropagation();
              e.preventDefault();
            }
          },
        },
      ],
    });
  }
}
