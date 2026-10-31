import './bootstrap/client.js';
import { AppNav } from './components/app-nav/index.js';
import { type AppRouteData, RouteView } from './routes.js';
import { RootStoreProvider } from './stores/root-store/components/provider.js';
import { RootStore } from './stores/root-store/index.js';

export type AppProps = {
  route: AppRouteData;
};

export function App({ route }: AppProps) {
  const rootStore = new RootStore(route.data.rootStoreSnapshot);

  return (
    <RootStoreProvider store={rootStore}>
      <AppNav pathname={route.pathname} />
      <RouteView route={route} />
    </RootStoreProvider>
  );
}
