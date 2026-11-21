import { action, observable } from 'mobx';
import { observer, enableStaticRendering } from 'mobx-react-lite';
import { ViewModelBase, ViewModelStoreBase, viewModelsConfig } from 'mobx-view-model';
import { ViewModelsProvider, useViewModel, withViewModel } from 'mobx-view-model-react';
import { type ReactNode, useEffect, useState } from 'react';

enableStaticRendering(typeof window === 'undefined');
viewModelsConfig.mode = 'ssr';

const pages = new Map([
  ['/', 'Catalog'],
  ['/category', 'Stationery'],
  ['/product', 'Notebook'],
  ['/cart', 'Cart'],
  ['/profile', 'Profile'],
]);

export const hasPage = (path: string) => pages.has(path);

class PageVM extends ViewModelBase<{ title: string }> {}

const Heading = observer(() => <h1>{useViewModel(PageVM).payload.title}</h1>);

const ShopPage = withViewModel(PageVM, ({ children }: { children?: ReactNode }) => (
  <main><Heading />{children}</main>
));

class ClockVM {
  ticks = observable.box(0);
  private timer?: number;

  mount() {
    if (typeof window !== 'undefined') {
      this.timer = window.setInterval(action(() => this.ticks.set(this.ticks.get() + 1)), 100);
    }
  }

  unmount() {
    window.clearInterval(this.timer);
  }
}

const Clock = withViewModel(ClockVM, ({ model }) => (
  <output aria-label="Client ticks">{model.ticks.get()}</output>
));

export function Shop({ path, inCart }: { path: string; inCart: boolean }) {
  const [store] = useState(() => new ViewModelStoreBase());
  const [pathname, setPathname] = useState(path);
  const [added, setAdded] = useState(inCart);

  useEffect(() => {
    const onPopState = () => setPathname(location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <ViewModelsProvider value={store}>
      <nav>
        {Array.from(pages, ([href, label]) => (
          <a key={href} href={href} onClick={(event) => {
            // Opening the cart loads a new document. Catalog links use client history.
            if (href === '/cart') return;
            event.preventDefault();
            history.pushState(null, '', href);
            setPathname(href);
          }}>{label}</a>
        ))}
      </nav>
      <ShopPage payload={{ title: pages.get(pathname) ?? 'Page not found' }}>
        {pathname === '/product' && (
          <button onClick={() => {
            document.cookie = 'notebook=1; Path=/; SameSite=Lax';
            setAdded(true);
          }}>{added ? 'In cart' : 'Add to cart'}</button>
        )}
        {!hasPage(pathname) && <Clock />}
        {pathname === '/cart' && <p>{added ? '1 × Notebook' : 'Empty cart'}</p>}
      </ShopPage>
    </ViewModelsProvider>
  );
}
