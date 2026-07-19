import { AnyObject } from "yummies/types";


const emptyObject: AnyObject = Object.freeze({});
const noop = (): undefined => {}

if (process.env.NODE_ENV !== 'production') {
  noop.displayName = 'DefaultFallback'
}

export const _internals = {
  emptyObject,
  noop
}