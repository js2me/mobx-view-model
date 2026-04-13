import { createContext } from 'react';
import type { RootStore } from './index.js';

export const RootStoreContext = createContext<RootStore | null>(null);
