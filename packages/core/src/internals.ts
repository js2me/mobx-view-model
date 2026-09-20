import { isShallowEqual } from "yummies/data";
import { AnyObject } from "yummies/types";


const emptyObject: AnyObject = Object.freeze({});
const noop = (): undefined => {}
const isClient = typeof window !== 'undefined';

if (process.env.NODE_ENV !== 'production') {
  noop.displayName = 'DefaultFallback'
}

const viewModelMarker = Symbol.for('@view-model@');

export const _internals = {
  emptyObject,
  noop,
  isClient,
  isShallowEqual,
  viewModelMarker,
}
