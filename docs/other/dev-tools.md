# DevTools

::: warning Work in Progress
`mobx-view-model-devtools` is currently a **WIP** project. The API and features may change at any time.
:::

A standalone devtools panel for inspecting and debugging your `ViewModel` instances in real time.

![DevTools screenshot 1](/devtools-screen-1.png)
![DevTools screenshot 2](/devtools-screen-2.png)  

Source: [js2me/mobx-view-model-devtools](https://github.com/js2me/mobx-view-model-devtools)

---

## Installation

The easiest way to inject the devtools is via a `<script>` tag — no npm install required.

### Option 1 — async script (recommended)

```html
<script
  async
  crossOrigin="anonymous"
  src="//unpkg.com/mobx-view-model-devtools/auto.global.js"
></script>
```

### Option 2 — dynamic fetch

Use this approach when you need finer control over when the script is loaded (e.g. only in development mode):

```html
<script>
  fetch('//unpkg.com/mobx-view-model-devtools/auto.global.js').then(async response => {
    const script = await response.text();
    const scriptElement = document.createElement('script');
    scriptElement.innerHTML = script;
    document.head.appendChild(scriptElement);
  });
</script>
```

---

## Connecting to a ViewModelStore

After the script is loaded, connect your `ViewModelStore` to the devtools:

```ts
ViewModelDevtools.connect(viewModelStore);
```

### Example

```ts
import { ViewModelStoreBase } from 'mobx-view-model';

const viewModelStore = new ViewModelStoreBase();

ViewModelDevtools.connect(viewModelStore);
```

---

## Connecting extra data

You can also expose arbitrary data (e.g. global stores, services) alongside your ViewModels:

```ts
ViewModelDevtools.connectExtras({ foo: 'bar' });
```

This is useful for attaching a `RootStore` or any other object you want to inspect in the panel.

---

## Development-only setup

To avoid loading devtools in production, wrap the injection in a condition:

```ts
if (import.meta.env.DEV) {
  const script = document.createElement('script');
  script.src = '//unpkg.com/mobx-view-model-devtools/auto.global.js';
  script.crossOrigin = 'anonymous';
  script.async = true;
  script.onload = () => {
    ViewModelDevtools.connect(viewModelStore);
  };
  document.head.appendChild(script);
}
```
