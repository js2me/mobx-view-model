import { ViewModelDevtools } from '../../../dist/index.js';
import {
  createDemoStore,
  demoDiagnostics,
} from '../../../stories/fixtures/create-demo-store';

const params = new URLSearchParams(location.search);
const count = Number(params.get('count') ?? 1000);
const childrenPerRoot = Number(params.get('children') ?? 9);
const demo = createDemoStore(count, childrenPerRoot);
const devtools = ViewModelDevtools.define({
  viewModels: demo.store,
  display: { showInternals: false },
});
if (params.has('expanded')) devtools.inspector.expandAll();
if (params.get('mode') === 'list')
  devtools.settings.setPresentationMode('list');
const fixture = {
  ...demo,
  devtools,
  diagnostics: demoDiagnostics,
  openedAt: 0,
  open() {
    this.openedAt = performance.now();
    devtools.showPopup();
  },
};
Object.assign(globalThis, { largeStore: fixture });
document
  .querySelector('#open')!
  .addEventListener('click', () => fixture.open());
document.querySelector('#ready')!.textContent = `${count} ViewModels ready`;
