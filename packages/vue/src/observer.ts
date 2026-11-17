import { Reaction } from 'mobx';
import type {
  Component,
  ComponentOptions,
  FunctionalComponent,
  RenderFunction,
} from 'vue';
import {
  getCurrentInstance,
  inject,
  onBeforeMount,
  onBeforeUnmount,
  shallowRef,
  ssrContextKey,
} from 'vue';
import { toStatefulComponent } from './component-adapter.js';
import { useRenderDependencies } from './render-dependencies.js';

type Render = (this: any, ...args: any[]) => any;

// Capture errors inside MobX, then let Vue handle them outside Reaction.track.
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

export const observer = <T extends Component>(component: T): T => {
  const options: ComponentOptions =
    typeof component === 'function'
      ? toStatefulComponent(component as FunctionalComponent)
      : (component as ComponentOptions);
  const name = options.name ?? 'MobxObserver';
  return {
    ...options,
    name,
    beforeUnmount: Array.isArray(options.beforeUnmount)
      ? options.beforeUnmount.filter(
          (hook: unknown) => typeof hook === 'function',
        )
      : options.beforeUnmount,
    setup(props: any, ctx: any) {
      const instance = getCurrentInstance()!;
      const isSSR = inject(ssrContextKey, null) != null;
      const dependencies = useRenderDependencies();
      const version = shallowRef(0);
      // A server render must never subscribe to long-lived MobX state.
      const reaction = isSSR
        ? null
        : new Reaction(`${name}.render`, () => {
            version.value++;
          });
      onBeforeUnmount(() => reaction?.dispose());

      const observeRender = (render: Render): Render =>
        function (...args) {
          void version.value;
          dependencies();
          return trackRender(reaction, () => render.apply(this, args));
        };
      const result = options.setup?.(props, ctx);
      if (typeof result === 'function') return observeRender(result);

      // Vue resolves render options and compiles templates after setup.
      // Wrap that single resolved render path once it is ready.
      if (!isSSR)
        onBeforeMount(() => {
          const target = instance as unknown as { render: RenderFunction };
          target.render = observeRender(target.render);
        });
      return result;
    },
  } as T;
};
