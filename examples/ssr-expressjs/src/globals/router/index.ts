import {
  createBrowserHistory,
  createMemoryHistory,
  type MemoryHistoryOptions,
  type WithObservableHistoryParams,
} from 'mobx-location-history';

export interface RouterParams {
  history?: WithObservableHistoryParams<MemoryHistoryOptions>;
}

export class Router {
  history;

  constructor(params?: RouterParams) {
    this.history =
      typeof window === 'undefined'
        ? createMemoryHistory(params?.history)
        : createBrowserHistory(params?.history);
  }

  navigate() {}
}
