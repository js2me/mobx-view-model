import { AnyObject } from "yummies/types";
import { PayloadComparator } from "./config/types.js";
import { isShallowEqual } from "yummies/data";
import { comparer } from "mobx";

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
  marker,
  comparer: {
    shallow: isShallowEqual,
    strict: comparer.structural,
  } satisfies Record<Extract<PayloadComparator, string>, any>
}
