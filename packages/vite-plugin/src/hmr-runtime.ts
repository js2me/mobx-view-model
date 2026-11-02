/** Generate a two-phase update: validate every instance before changing any store. */
export function generateHmrCode(
  vmClassNames: string[],
  privateClassNames: string[] = [],
): string {
  if (vmClassNames.length === 0) return '';

  return `
if (import.meta.hot) {
  const __vm_classes__ = { ${vmClassNames.join(', ')} };
  const __vm_private_classes__ = ${JSON.stringify(privateClassNames)};
  const __old_classes__ = import.meta.hot.data.__vm_classes__;
  if (__old_classes__) {
    const __updates__ = [];
    let __needs_reload__ = false;
    for (const __store__ of globalThis.__MOBX_VM_PLUGIN_STORES__ || []) {
      for (const [__name__, __NewClass__] of Object.entries(__vm_classes__)) {
        const __OldClass__ = __old_classes__[__name__];
        if (!__OldClass__ || __OldClass__ === __NewClass__) continue;
        const __ids__ = __store__.viewModelIdsByClasses.get(__OldClass__);
        const __instances__ = Array.from(__ids__ || [], id => __store__.viewModels.get(id)).filter(Boolean);
        const __has_private__ = __vm_private_classes__.includes(__name__) ||
          (import.meta.hot.data.__vm_private_classes__ || []).includes(__name__);
        for (const __instance__ of __instances__) {
          // MobX computed getters and bound actions, as well as arrow fields,
          // live on the instance. Changing its prototype cannot update them.
          const __own_behavior__ = Reflect.ownKeys(__instance__).some(key => {
            const descriptor = Object.getOwnPropertyDescriptor(__instance__, key);
            return descriptor.get || descriptor.set || typeof descriptor.value === 'function';
          });
          if (__has_private__ || __own_behavior__ || !Object.isExtensible(__instance__)) {
            __needs_reload__ = true;
          }
        }
        __updates__.push({ store: __store__, OldClass: __OldClass__, NewClass: __NewClass__, ids: __ids__, instances: __instances__ });
      }
    }
    if (__needs_reload__) {
      import.meta.hot.send('mobx-view-model:full-reload');
    } else {
      for (const { store, OldClass, NewClass, ids, instances } of __updates__) {
        if (ids) {
          store.viewModelIdsByClasses.set(NewClass, ids);
          store.viewModelIdsByClasses.delete(OldClass);
        }
        for (const [anchor, VM] of store.linkedAnchorVMClasses.entries()) {
          if (VM === OldClass) store.linkedAnchorVMClasses.set(anchor, NewClass);
        }
        for (const instance of instances) Object.setPrototypeOf(instance, NewClass.prototype);
      }
    }
  }
  import.meta.hot.dispose(() => {
    import.meta.hot.data.__vm_classes__ = __vm_classes__;
    import.meta.hot.data.__vm_private_classes__ = __vm_private_classes__;
  });
}`;
}
