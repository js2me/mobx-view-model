import { isShallowEqual } from "yummies/data";
import { AnyObject } from "yummies/types";


const emptyObject: AnyObject = Object.freeze({});
const noop = (): undefined => {}
const isClient = typeof window !== 'undefined';

if (process.env.NODE_ENV !== 'production') {
  noop.displayName = 'DefaultFallback'
}


const key = '@view-model@';

const marker = Symbol.for(key);

export const _internals = {
  key,
  emptyObject,
  noop,
  isClient,
  isShallowEqual,
  marker,
}
