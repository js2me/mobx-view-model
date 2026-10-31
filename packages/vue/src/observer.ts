import { Reaction } from 'mobx';
import type { Component, ComponentPublicInstance } from 'vue';
import {
  defineComponent,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  ssrContextKey,
} from 'vue';

const reactionKey = Symbol('mobxViewModelReaction');
const ssrKey = Symbol('mobxViewModelSSR');

// Rethrow outside MobX tracking so Vue can handle render failures.
const trackRender = (reaction: Reaction | null, render: () => any) => {
  if (!reaction) return render();
  let result: any;
  let error: unknown;
  let failed = false;
  reaction.track(() => {
    try {
      result = render();
    } catch (caught) {
      failed = true;
      error = caught;
    }
  });
  if (failed) throw error;
  return result;
};

const ensureReaction = (
  proxy: ComponentPublicInstance | null,
  name: string,
) => {
  if (!proxy) return null;
  const anyProxy = proxy as any;
  let reaction = anyProxy[reactionKey] as Reaction | undefined;

  if (!reaction) {
    reaction = new Reaction(`${name}.render`, () => {
      anyProxy.$forceUpdate?.();
    });
    anyProxy[reactionKey] = reaction;
  }

  return reaction;
};

const disposeReaction = (proxy: ComponentPublicInstance | null) => {
  if (!proxy) return;
  const anyProxy = proxy as any;
  const reaction = anyProxy[reactionKey] as Reaction | undefined;
  reaction?.dispose();
  delete anyProxy[reactionKey];
};

export const observer = <T extends Component>(component: T): T => {
  if (typeof component === 'function') {
    const fn = component as any;
    return observer(
      defineComponent({
        name: fn.displayName ?? fn.name ?? 'MobxObserver',
        props: fn.props,
        emits: fn.emits,
        inheritAttrs: fn.inheritAttrs,
        setup: (props, ctx) => () => fn(fn.props ? props : ctx.attrs, ctx),
      }),
    ) as unknown as T;
  }
  const name = (component as any).name ?? 'MobxObserver';
  const originalRender = (component as any).render as
    | ((...args: any[]) => any)
    | undefined;
  const originalSetup = (component as any).setup as
    | ((props: any, ctx: any) => any)
    | undefined;

  const wrapped: any = {
    ...component,
    name,
    // Vue only accepts functions in lifecycle option arrays.
    beforeUnmount: Array.isArray((component as any).beforeUnmount)
      ? (component as any).beforeUnmount.filter(
          (hook: unknown) => typeof hook === 'function',
        )
      : (component as any).beforeUnmount,
    setup(props: any, ctx: any) {
      const instance = getCurrentInstance();
      const proxy = instance?.proxy ?? null;
      const isSSR = inject(ssrContextKey, null) != null;
      if (proxy) (proxy as any)[ssrKey] = isSSR;
      const reaction = isSSR ? null : ensureReaction(proxy, name);

      onBeforeUnmount(() => {
        disposeReaction(proxy);
      });

      const setupResult = originalSetup?.(props, ctx);

      if (typeof setupResult === 'function') {
        return (...args: any[]) =>
          trackRender(reaction, () => setupResult(...args));
      }

      return setupResult;
    },
  };

  if (originalRender) {
    wrapped.render = function (...args: any[]) {
      const proxy = this as ComponentPublicInstance;
      const reaction = (proxy as any)[ssrKey]
        ? null
        : ensureReaction(proxy, name);
      return trackRender(reaction, () => originalRender.apply(this, args));
    };
  }

  return wrapped as T;
};
