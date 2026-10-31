import { reaction } from 'mobx';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ViewModelDevtools } from '../model/view-model-devtools';
import css from '../styles.module.css';
import { DevtoolsClient } from './devtools-client';

export class DevtoolsRenderer {
  private readonly lifetime = new AbortController();
  private container?: HTMLDivElement;
  private root?: Root;

  constructor(private readonly devtools: ViewModelDevtools) {}
  render() {
    if (this.container || this.lifetime.signal.aborted) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => this.render(), {
        once: true,
        signal: this.lifetime.signal,
      });
      return;
    }
    const id = this.devtools.config.containerId ?? 'view-model-devtools';
    if (document.getElementById(id)) return;
    const container = document.createElement('div');
    container.id = id;
    container.className = css.root;
    document.body.appendChild(container);
    this.container = container;
    reaction(
      () => this.devtools.settings.resolvedTheme,
      (theme) => {
        container.dataset.vmdTheme = theme;
      },
      { fireImmediately: true, signal: this.lifetime.signal },
    );
    this.root = createRoot(container);
    this.root.render(
      createElement(DevtoolsClient, { payload: { devtools: this.devtools } }),
    );
  }
  destroy() {
    this.lifetime.abort();
    this.root?.unmount();
    this.container?.remove();
    this.root = undefined;
    this.container = undefined;
  }
}
