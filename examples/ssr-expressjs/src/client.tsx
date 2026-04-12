import './app/bootstrap/client';

import { hydrateRoot } from 'react-dom/client';
import { App } from './app';
import { Globals } from './globals';

const ssrData = (globalThis as any).__SSR_DATA__;

const globals = Globals.fromSnapshot(ssrData);

hydrateRoot(document.getElementById('root')!, <App globals={globals} />);
