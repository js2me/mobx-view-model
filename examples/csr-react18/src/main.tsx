import { createRoot } from 'react-dom/client';
import { App } from './app.js';
import { RootStore } from './stores/root-store/index.js';
import { RootStoreProvider } from './stores/root-store/components/provider.js';
import './styles.css';

const rootStore = new RootStore({
  appInfo: {
    appName: 'Client Side App Name',
  },
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <RootStoreProvider store={rootStore}>
    <App />
  </RootStoreProvider>,
);
