import { internalCounter, createCounter } from './counter.js';
import { AnyObject } from './types.js';

declare const process: { env: { NODE_ENV?: string } };

export const generateVMId = (ctx: AnyObject) => {
  if (!ctx.generateId) {
    const staticId = internalCounter().toString(16);
    const counter = createCounter();

    ctx.generateId = () =>
      `${staticId}_${counter().toString().padStart(5, '0')}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return ctx.generateId();
  } else {
    return `${ctx.VM?.name}_${ctx.generateId()}`;
  }
};
