/**
 * Generates the HMR dispose + class-remapping code to inject at the end
 * of a ViewModel class file.
 *
 * On first load: saves current class references via import.meta.hot.dispose().
 * On HMR re-evaluation: reads old refs from hot.data, compares with new refs,
 * remaps viewModelIdsByClasses and linkedAnchorVMClasses, patches instance prototypes.
 */
export function generateHmrCode(vmClassNames: string[]): string {
  if (vmClassNames.length === 0) return '';

  const classRefsObj = vmClassNames.map((name) => `  ${name}`).join(',\n');

  return `
if (import.meta.hot) {
  const __vm_classes__ = {
${classRefsObj}
  };
  if (import.meta.hot.data.__vm_classes__) {
    const __old_classes__ = import.meta.hot.data.__vm_classes__;
    const __stores__ = globalThis.__MOBX_VM_PLUGIN_STORES__ || [];
    for (const __store__ of __stores__) {
      const __ids_by_classes__ = __store__.viewModelIdsByClasses;
      const __anchor_classes__ = __store__.linkedAnchorVMClasses;
      for (const [__name__, __NewClass__] of Object.entries(__vm_classes__)) {
        const __OldClass__ = __old_classes__[__name__];
        if (__OldClass__ && __OldClass__ !== __NewClass__) {
          const __ids__ = __ids_by_classes__.get(__OldClass__);
          if (__ids__) {
            __ids_by_classes__.set(__NewClass__, __ids__);
            __ids_by_classes__.delete(__OldClass__);
          }
          for (const [__anchor__, __vmClass__] of __anchor_classes__.entries()) {
            if (__vmClass__ === __OldClass__) {
              __anchor_classes__.set(__anchor__, __NewClass__);
            }
          }
          if (__ids__) {
            const __viewModels__ = __store__.viewModels;
            for (const __id__ of __ids__) {
              const __instance__ = __viewModels__.get(__id__);
              if (__instance__ && __instance__.constructor !== __NewClass__) {
                Object.setPrototypeOf(__instance__, __NewClass__.prototype);
              }
            }
          }
        }
      }
    }
  }
  import.meta.hot.dispose(() => {
    import.meta.hot.data.__vm_classes__ = __vm_classes__;
  });
}`;
}
