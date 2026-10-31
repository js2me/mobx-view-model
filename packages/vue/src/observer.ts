import { Reaction } from 'mobx';
import type { Component, ComponentPublicInstance } from 'vue';
import { getCurrentInstance, onBeforeUnmount } from 'vue';

const reactionKey = Symbol('mobxViewModelReaction');

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
      const reaction = ensureReaction(proxy, name);

      onBeforeUnmount(() => {
        disposeReaction(proxy);
      });

      const setupResult = originalSetup?.(props, ctx);

      if (typeof setupResult === 'function') {
        return (...args: any[]) => {
          let renderResult: any;
          reaction?.track(() => {
            renderResult = setupResult(...args);
          });
          return renderResult;
        };
      }

      return setupResult;
    },
  };

  if (originalRender) {
    wrapped.render = function (...args: any[]) {
      const proxy = this as ComponentPublicInstance;
      const reaction = ensureReaction(proxy, name);
      let renderResult: any;
      reaction?.track(() => {
        renderResult = originalRender.apply(this, args);
      });
      return renderResult;
    };
  }

  return wrapped as T;
};
