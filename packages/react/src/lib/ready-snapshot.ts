import { _internals } from 'mobx-view-model';

export const readySnapshot = () => true;
export const subscribeNoop = () => _internals.noop;
