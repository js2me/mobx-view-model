import { type Component, createApp } from 'vue';

export const mount = (root: Component) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const app = createApp(root);
  app.mount(el);
  return {
    el,
    unmount: () => {
      app.unmount();
      el.remove();
    },
  };
};
