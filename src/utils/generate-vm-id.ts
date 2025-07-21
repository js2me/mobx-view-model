import { createCounter } from 'yummies/complex';

import { AnyObject } from './types.js';

declare const process: { env: { NODE_ENV?: string } };

const staticCounter = createCounter((counter) => counter.toString(16));

export const generateVmId = (ctx: AnyObject) => {
  if (!ctx.generateId) {
    const staticId = staticCounter();
    const counter = createCounter((counter) =>
      counter.toString().padStart(5, '0'),
    );

    ctx.generateId = () =>
      `${staticId}_${counter().toString().padStart(5, '0')}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return ctx.generateId();
  } else {
    const viewModelName = ctx.VM?.name ?? '';

    if (viewModelName) {
      return `${viewModelName}_${ctx.generateId()}`;
    } else {
      return ctx.generateId();
    }
  }
};
