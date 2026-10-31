import { makeObservable } from 'mobx';
import {
  ViewModelBase,
  ViewModelStoreBase,
  type AnyViewModel,
  type AnyViewModelSimple,
  type ViewModelParams,
} from 'mobx-view-model';
import { ViewModelsProvider, withViewModel } from 'mobx-view-model-react';
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  Component,
  StrictMode,
  Suspense,
  lazy,
  startTransition,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { afterEach, describe, expect, test } from 'vitest';

class TestViewModel<
  Payload extends Record<string, unknown> = Record<string, never>,
  Parent extends AnyViewModel | AnyViewModelSimple | null = null,
> extends ViewModelBase<Payload, Parent> {
  constructor(params?: Partial<ViewModelParams<Payload, Parent>>) {
    super({ ...params, id: params?.id ?? 'test', payload: params?.payload as Payload });
    makeObservable(this);
  }
}

class TestViewModelStore extends ViewModelStoreBase {
  constructor() { super({}); }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { return this.state.error ? <span data-testid="error">{this.state.error.message}</span> : this.props.children; }
}

const deferredModule = () => {
  let resolve!: (module: { default: ComponentType }) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<{ default: ComponentType }>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const deferredResource = () => {
  let resolve!: (value: string) => void;
  let status: 'pending' | 'resolved' = 'pending';
  let value!: string;
  const promise = new Promise<string>((resolvePromise) => { resolve = resolvePromise; });
  promise.then((result) => { status = 'resolved'; value = result; });
  return {
    resolve,
    read() {
      if (status === 'pending') throw promise;
      return value;
    },
  };
};

afterEach(cleanup);

describe('React 18 nested lazy and Suspense VM regressions', () => {
  test('reveals three nested lazy levels in stages without duplicate VMs', async () => {
    const store = new TestViewModelStore();
    class FirstVM extends TestViewModel {}
    class SecondVM extends TestViewModel {}
    class ThirdVM extends TestViewModel {}
    const first = deferredModule(); const second = deferredModule(); const third = deferredModule();
    const LazyFirst = lazy(() => first.promise); const LazySecond = lazy(() => second.promise); const LazyThird = lazy(() => third.promise);
    const Third = withViewModel(ThirdVM, () => <span data-testid="third">third</span>);
    const Second = withViewModel(SecondVM, () => <><span data-testid="second">second</span><Suspense fallback={<span data-testid="third-loading">third loading</span>}><LazyThird /></Suspense></>);
    const First = withViewModel(FirstVM, () => <><span data-testid="first">first</span><Suspense fallback={<span data-testid="second-loading">second loading</span>}><LazySecond /></Suspense></>);

    await act(async () => { render(<ViewModelsProvider value={store}><Suspense fallback={<span data-testid="first-loading">first loading</span>}><LazyFirst /></Suspense></ViewModelsProvider>); });
    expect(screen.getByTestId('first-loading')).toBeDefined();
    expect(store.getIds(FirstVM)).toHaveLength(0);
    await act(async () => first.resolve({ default: First }));
    expect(screen.getByTestId('first')).toBeDefined(); expect(screen.getByTestId('second-loading')).toBeDefined();
    expect(store.getIds(FirstVM)).toHaveLength(1); expect(store.getIds(SecondVM)).toHaveLength(0);
    await act(async () => second.resolve({ default: Second }));
    expect(screen.getByTestId('second')).toBeDefined(); expect(screen.getByTestId('third-loading')).toBeDefined(); expect(store.getIds(SecondVM)).toHaveLength(1);
    await act(async () => third.resolve({ default: Third }));
    expect(screen.getByTestId('third')).toBeDefined(); expect(store.getIds(ThirdVM)).toHaveLength(1);
    expect(store.getAll(SecondVM)[0].parentViewModel).toBe(store.getAll(FirstVM)[0]);
    expect(store.getAll(ThirdVM)[0].parentViewModel).toBe(store.getAll(SecondVM)[0]);
  });

  test('escalates a post-commit nested child suspension to the outer boundary', async () => {
    const store = new TestViewModelStore(); class PageVM extends TestViewModel {} class ChildVM extends TestViewModel {}
    const child = deferredModule(); const LazyChild = lazy(() => child.promise); const Child = withViewModel(ChildVM, () => <span data-testid="child">child</span>);
    let showChild!: () => void;
    const Page = withViewModel(PageVM, () => { const [visible, setVisible] = useState(false); showChild = () => setVisible(true); return visible ? <LazyChild /> : <span data-testid="page">page</span>; });
    await act(async () => { render(<ViewModelsProvider value={store}><Suspense fallback={<span data-testid="outer-loading">loading</span>}><Page /></Suspense></ViewModelsProvider>); });
    const page = store.getAll(PageVM)[0]; await act(async () => showChild());
    expect(screen.getByTestId('outer-loading')).toBeDefined(); expect(store.getIds(PageVM)).toHaveLength(0); expect(store.getIds(ChildVM)).toHaveLength(0);
    await act(async () => child.resolve({ default: Child }));
    expect(screen.getByTestId('child')).toBeDefined(); expect(store.getIds(PageVM)).toHaveLength(1); expect(store.getAll(PageVM)[0]).toBe(page); expect(store.getAll(ChildVM)[0].parentViewModel).toBe(page);
  });

  test('keeps sibling nested boundaries independent while one lazy child resolves', async () => {
    const store = new TestViewModelStore(); class LeftVM extends TestViewModel {} class RightVM extends TestViewModel {}
    const left = deferredModule(); const right = deferredModule(); const LazyLeft = lazy(() => left.promise); const LazyRight = lazy(() => right.promise);
    const Left = withViewModel(LeftVM, () => <span data-testid="left">left</span>); const Right = withViewModel(RightVM, () => <span data-testid="right">right</span>);
    await act(async () => { render(<ViewModelsProvider value={store}><><Suspense fallback={<span data-testid="left-loading">left loading</span>}><LazyLeft /></Suspense><Suspense fallback={<span data-testid="right-loading">right loading</span>}><LazyRight /></Suspense></></ViewModelsProvider>); });
    await act(async () => left.resolve({ default: Left }));
    expect(screen.getByTestId('left')).toBeDefined(); expect(screen.getByTestId('right-loading')).toBeDefined(); expect(store.getIds(LeftVM)).toHaveLength(1); expect(store.getIds(RightVM)).toHaveLength(0);
    await act(async () => right.resolve({ default: Right }));
    expect(screen.getByTestId('right')).toBeDefined(); expect(store.getIds(LeftVM)).toHaveLength(1); expect(store.getIds(RightVM)).toHaveLength(1);
  });

  test('links a lazy child to its committed parent after the child retry', async () => {
    const store = new TestViewModelStore(); class ParentVM extends TestViewModel {} class ChildVM extends TestViewModel {}
    const child = deferredModule(); const LazyChild = lazy(() => child.promise); const Child = withViewModel(ChildVM, () => <span data-testid="child">child</span>);
    const Parent = withViewModel(ParentVM, () => <Suspense fallback={<span data-testid="child-loading">loading</span>}><LazyChild /></Suspense>);
    await act(async () => { render(<ViewModelsProvider value={store}><Parent /></ViewModelsProvider>); });
    const parent = store.getAll(ParentVM)[0]; expect(screen.getByTestId('child-loading')).toBeDefined();
    await act(async () => child.resolve({ default: Child }));
    expect(screen.getByTestId('child')).toBeDefined(); expect(store.getAll(ChildVM)[0].parentViewModel).toBe(parent); expect(store.getAll(ParentVM)[0]).toBe(parent);
  });

  test('ignores a late competing lazy route after another route wins', async () => {
    const store = new TestViewModelStore(); class AlphaVM extends TestViewModel {} class BetaVM extends TestViewModel {}
    const alpha = deferredModule(); const beta = deferredModule(); const LazyAlpha = lazy(() => alpha.promise); const LazyBeta = lazy(() => beta.promise);
    const Alpha = withViewModel(AlphaVM, () => <span data-testid="alpha">alpha</span>); const Beta = withViewModel(BetaVM, () => <span data-testid="beta">beta</span>);
    let navigate!: (route: 'alpha' | 'beta') => void;
    const Router = () => { const [route, setRoute] = useState<'alpha' | 'beta'>('alpha'); navigate = setRoute; return <Suspense fallback={<span data-testid="route-loading">loading</span>}>{route === 'alpha' ? <LazyAlpha /> : <LazyBeta />}</Suspense>; };
    await act(async () => { render(<ViewModelsProvider value={store}><Router /></ViewModelsProvider>); }); await act(async () => navigate('beta')); await act(async () => alpha.resolve({ default: Alpha }));
    expect(screen.getByTestId('route-loading')).toBeDefined(); expect(store.getIds(AlphaVM)).toHaveLength(0);
    await act(async () => beta.resolve({ default: Beta }));
    expect(screen.getByTestId('beta')).toBeDefined(); expect(store.getIds(BetaVM)).toHaveLength(1); expect(store.getIds(AlphaVM)).toHaveLength(0);
  });

  test('does not commit a nested pending child after navigation returns home', async () => {
    const store = new TestViewModelStore(); class HomeVM extends TestViewModel {} class PageVM extends TestViewModel {} class ChildVM extends TestViewModel {}
    const child = deferredModule(); const LazyChild = lazy(() => child.promise); const Home = withViewModel(HomeVM, () => <span data-testid="home">home</span>); const Child = withViewModel(ChildVM, () => <span data-testid="child">child</span>);
    const Page = withViewModel(PageVM, () => <Suspense fallback={<span data-testid="child-loading">loading</span>}><LazyChild /></Suspense>);
    let navigate!: (route: 'home' | 'page') => void;
    const Router = () => { const [route, setRoute] = useState<'home' | 'page'>('home'); navigate = setRoute; return route === 'home' ? <Home /> : <Page />; };
    await act(async () => { render(<ViewModelsProvider value={store}><Router /></ViewModelsProvider>); }); await act(async () => navigate('page'));
    expect(screen.getByTestId('child-loading')).toBeDefined(); expect(store.getIds(PageVM)).toHaveLength(1);
    await act(async () => navigate('home')); await act(async () => child.resolve({ default: Child }));
    expect(screen.getByTestId('home')).toBeDefined(); expect(store.getIds(HomeVM)).toHaveLength(1); expect(store.getIds(PageVM)).toHaveLength(0); expect(store.getIds(ChildVM)).toHaveLength(0);
  });

  test('abandons an interrupted transition when a nested route returns home', async () => {
    const store = new TestViewModelStore(); class HomeVM extends TestViewModel {} class PageVM extends TestViewModel {}
    const page = deferredModule(); const LazyPage = lazy(() => page.promise); const Home = withViewModel(HomeVM, () => <span data-testid="home">home</span>); const Page = withViewModel(PageVM, () => <span data-testid="page">page</span>);
    let go!: (route: 'home' | 'page') => void;
    const Router = () => { const [route, setRoute] = useState<'home' | 'page'>('home'); go = (next) => startTransition(() => setRoute(next)); return <Suspense fallback={<span data-testid="loading">loading</span>}>{route === 'home' ? <Home /> : <LazyPage />}</Suspense>; };
    await act(async () => { render(<ViewModelsProvider value={store}><Router /></ViewModelsProvider>); }); const home = store.getAll(HomeVM)[0]; await act(async () => go('page'));
    expect(screen.getByTestId('home')).toBeDefined(); await act(async () => go('home')); await act(async () => page.resolve({ default: Page }));
    expect(screen.getByTestId('home')).toBeDefined(); expect(store.getAll(HomeVM)[0]).toBe(home); expect(store.getIds(PageVM)).toHaveLength(0);
  });

  test('commits one parent and child VM through a StrictMode nested retry', async () => {
    const store = new TestViewModelStore(); class ParentVM extends TestViewModel {} class ChildVM extends TestViewModel {}
    const parent = deferredModule(); const child = deferredModule(); const LazyParent = lazy(() => parent.promise); const LazyChild = lazy(() => child.promise);
    const Child = withViewModel(ChildVM, () => <span data-testid="child">child</span>); const Parent = withViewModel(ParentVM, () => <Suspense fallback={<span data-testid="child-loading">loading</span>}><LazyChild /></Suspense>);
    await act(async () => { render(<StrictMode><ViewModelsProvider value={store}><Suspense fallback={<span data-testid="parent-loading">loading</span>}><LazyParent /></Suspense></ViewModelsProvider></StrictMode>); });
    await act(async () => parent.resolve({ default: Parent })); expect(screen.getByTestId('child-loading')).toBeDefined(); await act(async () => child.resolve({ default: Child }));
    expect(screen.getByTestId('child')).toBeDefined(); expect(store.getIds(ParentVM)).toHaveLength(1); expect(store.getIds(ChildVM)).toHaveLength(1); expect(store.getAll(ChildVM)[0].parentViewModel).toBe(store.getAll(ParentVM)[0]);
  });

  test('retries a local nested lazy failure with a new lazy type', async () => {
    const store = new TestViewModelStore(); class PageVM extends TestViewModel {} class ChildVM extends TestViewModel {}
    const failed = deferredModule(); const retry = deferredModule(); const FailedChild = lazy(() => failed.promise); const RetriedChild = lazy(() => retry.promise); const Child = withViewModel(ChildVM, () => <span data-testid="child">child</span>);
    const Page = withViewModel(PageVM, ({ version }: { version: number }) => { const Nested = version === 0 ? FailedChild : RetriedChild; return <Suspense fallback={<span data-testid="child-loading">loading</span>}><Nested /></Suspense>; });
    const App = () => { const [boundaryKey, setBoundaryKey] = useState(0); const [version, setVersion] = useState(0); return <><button data-testid="retry" onClick={() => { setVersion(1); setBoundaryKey(1); }}>retry</button><ErrorBoundary key={boundaryKey}><Page version={version} /></ErrorBoundary></>; };
    await act(async () => { render(<ViewModelsProvider value={store}><App /></ViewModelsProvider>); }); await act(async () => failed.reject(new Error('child failed')));
    expect(screen.getByTestId('error').textContent).toBe('child failed'); expect(store.getIds(ChildVM)).toHaveLength(0);
    await act(async () => { screen.getByTestId('retry').click(); }); expect(screen.getByTestId('child-loading')).toBeDefined(); await act(async () => retry.resolve({ default: Child }));
    expect(screen.getByTestId('child')).toBeDefined(); expect(store.getIds(PageVM)).toHaveLength(1); expect(store.getAll(ChildVM)[0].parentViewModel).toBe(store.getAll(PageVM)[0]);
  });

  test('preserves VM identity when a resource resolves below a lazy page after a parent rerender', async () => {
    const store = new TestViewModelStore(); class PageVM extends TestViewModel {} class DataVM extends TestViewModel {}
    const page = deferredModule(); const data = deferredResource(); const LazyPage = lazy(() => page.promise);
    const Data = withViewModel(DataVM, ({ model }) => <span data-testid="data">{`${model.id}:${data.read()}`}</span>);
    const Page = withViewModel(PageVM, () => <><span data-testid="page">page</span><Suspense fallback={<span data-testid="data-loading">loading</span>}><Data /></Suspense></>);
    let rerenderParent!: () => void;
    const App = () => { const [, setRevision] = useState(0); rerenderParent = () => setRevision((revision) => revision + 1); return <Suspense fallback={<span data-testid="page-loading">loading</span>}><LazyPage /></Suspense>; };
    await act(async () => { render(<ViewModelsProvider value={store}><App /></ViewModelsProvider>); }); await act(async () => page.resolve({ default: Page }));
    const pageVm = store.getAll(PageVM)[0]; expect(screen.getByTestId('data-loading')).toBeDefined(); await act(async () => rerenderParent());
    expect(store.getAll(PageVM)[0]).toBe(pageVm); expect(store.getIds(DataVM)).toHaveLength(0); await act(async () => data.resolve('ready'));
    expect(screen.getByTestId('data').textContent).toMatch(/:ready$/); expect(store.getAll(PageVM)[0]).toBe(pageVm); expect(store.getIds(DataVM)).toHaveLength(1); expect(store.getAll(DataVM)[0].parentViewModel).toBe(pageVm);
  });
});
