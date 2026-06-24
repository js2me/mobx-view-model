# `withPropsViewModel` HOC

<ReactImportDeprecationWarning />

Same as [`withViewModel`](/react/api/with-view-model), but **component props are the ViewModel payload**.

You write `<Page userId="1" />` instead of passing a nested `payload` prop.

Under the hood it is `withViewModel` with `getPayload: (props) => props`. Everything else — `observer()`, SSR, `fallback`, `anchors`, `connect()` — works the same. See [`withViewModel`](/react/api/with-view-model) for details.

::: info This HOC wraps your view component into `observer()` HOC!
Enabled by default via [`wrapViewsInObserver`](/api/view-models/view-models-config#wrapviewsinobserver), same as `withViewModel`.
:::

## Signature

```tsx
withPropsViewModel(ViewModelClass, ViewComponent, config?)
```

`config` is [`ViewModelHocConfig`](/react/api/with-view-model#configuration) without `getPayload`.

## Usage

Define payload on the ViewModel. Type the view with [`ViewModelProps`](/react/api/with-view-model#usage) — do not duplicate payload fields there.

```tsx
import { ViewModelBase } from 'mobx-view-model';
import { withPropsViewModel, type ViewModelProps } from 'mobx-view-model-react';

interface Payload {
  userId: string;
}

class PageVM extends ViewModelBase<Payload> {}

interface PageViewProps extends ViewModelProps<PageVM> {}

export const Page = withPropsViewModel(PageVM, ({ model }: PageViewProps) => {
  return <div>{model.payload.userId}</div>;
});

<Page userId="1" />
```

Optional payload fields work as usual — the component can be rendered with no props or with a subset of them.

```tsx
interface Payload {
  title?: string;
}

class TitleVM extends ViewModelBase<Payload> {}

export const Title = withPropsViewModel(TitleVM, ({ model }) => (
  <div>{model.payload.title ?? 'untitled'}</div>
));

<Title />
<Title title="hello" />
```

### Configuration

```tsx
export const Page = withPropsViewModel(
  PageVM,
  () => <div>...</div>,
  {
    id: 'page',
    fallback: () => <div>loading...</div>,
  },
);
```

All [`withViewModel` config options](/react/api/with-view-model#configuration) except `getPayload`.

## Notes

- Not compatible with `<Suspense />` / `lazy()` — [same as `withViewModel`](/react/api/with-view-model#incompatibility-with-suspense-and-lazy).
- Generic ViewModel types — [same caveats as `withViewModel`](/react/api/with-view-model#generic-types-for-your-wrapped-viewmodel-in-this-hoc).
