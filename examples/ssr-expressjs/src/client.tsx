import { hydrateRoot } from 'react-dom/client';
import { App } from './app.js';
import type { AppRouteData } from './routes.js';

declare global {
  interface Window {
    __SSR_DATA__?: AppRouteData;
  }
}

const route = window.__SSR_DATA__;
if (!route) {
  throw new Error('Missing SSR payload');
}

hydrateRoot(document.getElementById('root')!, <App route={route} />);
