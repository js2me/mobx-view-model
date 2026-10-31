import { runInAction } from 'mobx';
import { type CreateRefConfig, createRef, type Ref } from 'yummies/mobx';

export interface FocusableRef<T extends HTMLElement = HTMLElement>
  extends Ref<T, { focused: boolean }> {}

export const createFocusableRef = <T extends HTMLElement = HTMLElement>(
  cfg?: Pick<CreateRefConfig<T>, 'onSet' | 'onUnset'>,
): FocusableRef<T> => {
  const refreshFocused = () => {
    runInAction(() => {
      ref.meta.focused = document.activeElement === ref.current;
    });
  };

  const ref = createRef({
    meta: {
      focused: false,
    },
    onSet: (curr: T, prev) => {
      refreshFocused();
      curr.addEventListener('focus', refreshFocused, true);
      curr.addEventListener('blur', refreshFocused, true);
      cfg?.onSet?.(curr, prev);
    },
    onUnset: (last) => {
      cfg?.onUnset?.(last);
      last?.removeEventListener('focus', refreshFocused, true);
      last?.removeEventListener('blur', refreshFocused, true);
    },
  });

  return ref;
};
