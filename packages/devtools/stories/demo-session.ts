import { makeAutoObservable, runInAction } from 'mobx';
import { ViewModelDevtools } from '../src';
import {
  createDemoStore,
  ProjectViewModel,
} from './fixtures/create-demo-store';

export interface DemoOptions {
  count: number;
  childrenPerRoot: number;
  expanded: boolean;
  live: boolean;
  theme: 'dark' | 'light';
}

/** Owns the connected store, devtools and the entire story lifetime. */
export class DemoSession {
  readonly demo;
  readonly devtools;
  openMs = 0;
  propertyModels = 0;
  vmCount = 0;
  private timer?: ReturnType<typeof setInterval>;
  private frame?: number;
  private disposed = false;
  private nextId: number;

  constructor(readonly options: DemoOptions) {
    this.demo = createDemoStore(options.count, options.childrenPerRoot);
    this.nextId = options.count;
    this.devtools = ViewModelDevtools.define({
      viewModels: this.demo.store,
      display: { showInternals: false, theme: options.theme },
    });
    this.devtools.settings.setTheme(options.theme);
    this.devtools.settings.setShowInternals(false);
    this.devtools.settings.setPresentationMode('tree');
    this.devtools.inspector.search.resetSearch();
    this.vmCount = this.demo.instances.length;
    makeAutoObservable(
      this,
      { demo: false, devtools: false },
      { autoBind: true },
    );
    if (options.expanded) this.devtools.inspector.expandAll();
    this.open();
    if (options.live) this.timer = setInterval(this.update, 500);
  }
  open() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    const started = performance.now();
    this.devtools.showPopup();
    this.frame = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.frame = requestAnimationFrame(() => {
        if (this.disposed) return;
        runInAction(() => {
          this.openMs = Math.round(performance.now() - started);
          this.refreshMetrics();
        });
      });
    });
  }
  refreshMetrics() {
    this.propertyModels = this.devtools.inspector.items.size;
    this.vmCount = this.demo.instances.length;
  }
  update() {
    for (const vm of this.demo.instances.slice(0, 20)) vm.increment();
    this.refreshMetrics();
  }
  add() {
    const index = this.nextId++;
    this.demo.instances.push(
      this.demo.store.define({
        VM: ProjectViewModel,
        id: `project-${String(index).padStart(5, '0')}`,
        payload: { index },
      }),
    );
    this.devtools.notifyVmChange();
    this.refreshMetrics();
  }
  remove() {
    const vm = this.demo.instances.pop();
    if (vm) this.demo.store.unmount(vm);
    this.devtools.notifyVmChange();
    this.refreshMetrics();
  }
  findLast() {
    const id = this.demo.instances.at(-1)?.id ?? '';
    this.devtools.searchEngine.handleSearchInput({
      target: { value: id },
    } as React.ChangeEvent<HTMLInputElement>);
  }
  destroy() {
    this.disposed = true;
    clearInterval(this.timer);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.devtools.destroy();
    this.demo.store.clean();
  }
}
