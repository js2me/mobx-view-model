import type { ComponentOptions, FunctionalComponent } from 'vue';
import { cloneVNode, getCurrentInstance, isVNode, useAttrs } from 'vue';

export const toStatefulComponent = (
  component: FunctionalComponent<any, any>,
): ComponentOptions => ({
  name: component.displayName ?? component.name ?? 'MobxObserver',
  props: component.props,
  emits: component.emits,
  inheritAttrs: component.props ? component.inheritAttrs : false,
  setup: (props, ctx) => () => {
    const result = component(component.props ? props : ctx.attrs, ctx);
    if (
      component.props ||
      component.inheritAttrs === false ||
      !isVNode(result) ||
      !(result.shapeFlag & 7)
    )
      return result;
    // Preserve Vue's restricted fallthrough for functions without declared props.
    const attrs = Object.fromEntries(
      Object.entries(ctx.attrs).filter(
        ([key]) => key === 'class' || key === 'style' || /^on[^a-z]/.test(key),
      ),
    );
    return cloneVNode(result, attrs);
  },
});

/** A stable props object with live values, including undeclared Vue attributes. */
export const useComponentProps = (props: Record<string, any>) => {
  const attrs = useAttrs();
  const instance = getCurrentInstance()!;
  const hasKey = (key: PropertyKey) =>
    key === 'payload'
      ? Object.hasOwn(instance.vnode.props ?? {}, key)
      : key in attrs;
  return new Proxy({} as Record<string, any>, {
    get: (_, key) =>
      key in props ? props[key as string] : attrs[key as string],
    has: (_, key) => hasKey(key),
    ownKeys: () => [
      ...Reflect.ownKeys(instance.proxy!.$attrs),
      ...(hasKey('payload') ? ['payload'] : []),
    ],
    getOwnPropertyDescriptor: (_, key) =>
      hasKey(key) ? { enumerable: true, configurable: true } : undefined,
  });
};
