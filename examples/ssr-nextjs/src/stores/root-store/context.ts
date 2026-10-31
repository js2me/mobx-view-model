import { createContext } from 'react';
import type { RootStore } from '.';

export const RootStoreContext = createContext<RootStore | null>(null);
