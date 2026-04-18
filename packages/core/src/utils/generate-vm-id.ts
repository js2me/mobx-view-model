import { createCounter } from 'yummies/complex';
import type { AnyObject } from 'yummies/types';
import type { GenerateViewModelIdFn } from '../config/index.js';

declare const process: { env: { NODE_ENV?: string } };

const staticCounter = createCounter((counter) => counter.toString(16));

export const generateVmId: GenerateViewModelIdFn = (ctx: AnyObject) => {
  if (!ctx.generateId) {
    const staticId = staticCounter();
    const counter = createCounter((counter) =>
      counter.toString().padStart(5, '0'),
    );

    ctx.generateId = () =>
      ctx.renderId ?? `${staticId}_${counter().toString().padStart(5, '0')}`;
  }

  const dynamicId = ctx.generateId();

  if (process.env.NODE_ENV === 'production') {
    return dynamicId;
  } else {
    const viewModelName = ctx.VM?.name ?? '';

    if (viewModelName) {
      return `${viewModelName}_${dynamicId}`;
    } else {
      return dynamicId;
    }
  }
};
