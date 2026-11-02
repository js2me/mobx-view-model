import { RUNTIME_MODULE_ID } from './store-access.js';

/** Generate a two-phase update: validate every instance before changing any store. */
export function generateHmrCode(
  vmClassNames: string[],
  privateClassNames: string[] = [],
): string {
  if (vmClassNames.length === 0) return '';

  return `
import { __vm_isObservableProp__, __vm_isComputedProp__ } from ${JSON.stringify(RUNTIME_MODULE_ID)};
if (import.meta.hot) {
  const __vm_classes__ = { ${vmClassNames.join(', ')} };
  const __vm_private_classes__ = ${JSON.stringify(privateClassNames)};
  const __old_classes__ = import.meta.hot.data.__vm_classes__;
  if (__old_classes__) {
    const __updates__ = [];
    let __needs_reload__ = Object.keys(__old_classes__).some(name => !Object.hasOwn(__vm_classes__, name));
    const __find_descriptor__ = (prototype, key) => {
      while (prototype) {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        if (descriptor) return descriptor;
        prototype = Object.getPrototypeOf(prototype);
      }
    };
    for (const __store__ of globalThis.__MOBX_VM_PLUGIN_STORES__ || []) {
      for (const [__name__, __NewClass__] of Object.entries(__vm_classes__)) {
        const __OldClass__ = __old_classes__[__name__];
        if (!__OldClass__ || __OldClass__ === __NewClass__) continue;
        const __ids__ = __store__.viewModelIdsByClasses.get(__OldClass__);
        const __instances__ = Array.from(__ids__ || [], id => __store__.viewModels.get(id)).filter(Boolean);
        const __has_private__ = __vm_private_classes__.includes(__name__) ||
          (import.meta.hot.data.__vm_private_classes__ || []).includes(__name__);
        for (const __instance__ of __instances__) {
          // Observable field accessors retain state. Computed/action wrappers
          // from an unchanged base are safe too; wrappers owned by a changed
          // prototype and constructor-created behavior need a full reload.
          const __own_behavior__ = Reflect.ownKeys(__instance__).some(key => {
            const descriptor = Object.getOwnPropertyDescriptor(__instance__, key);
            if (__vm_isObservableProp__(__instance__, key) && !__vm_isComputedProp__(__instance__, key)) return false;
            if (!descriptor.get && !descriptor.set && typeof descriptor.value !== 'function') return false;
            const old = __find_descriptor__(__OldClass__.prototype, key);
            const next = __find_descriptor__(__NewClass__.prototype, key);
            return !old || !next || old.get !== next.get || old.set !== next.set || old.value !== next.value;
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
