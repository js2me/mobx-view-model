# `withPropsViewModel` HOC

Same as [`withViewModel`](/solid/api/with-view-model), but **component props are the ViewModel payload**.

You write `<Page userId="1" />` instead of a nested `payload` prop.

Under the hood it is `withViewModel` with `getPayload: (props) => props`. See [`withViewModel`](/solid/api/with-view-model) for `fallback`, `anchors`, `connect()`, `solidHook`, etc.

## Signature

```tsx
withPropsViewModel(ViewModelClass, ViewComponent, config?)
```

`config` is [`ViewModelHocConfig`](/solid/api/with-view-model#configuration) without `getPayload`.

## Usage

```tsx
import { ViewModelBase } from "mobx-view-model";
import { withPropsViewModel, type ViewModelProps } from "mobx-view-model-solid";

interface Payload {
  userId: string;
}

class PageVM extends ViewModelBase<Payload> {}

interface PageViewProps extends ViewModelProps<PageVM> {}

export const Page = withPropsViewModel(PageVM, (props: PageViewProps) => {
  return <div>{props.model.payload.userId}</div>;
});

<Page userId="1" />
```

Optional payload fields work as usual:

```tsx
interface Payload {
  title?: string;
}

class TitleVM extends ViewModelBase<Payload> {}

export const Title = withPropsViewModel(TitleVM, (props) => (
  <div>{props.model.payload.title ?? "untitled"}</div>
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
    id: "page",
    fallback: () => <div>loading...</div>,
  },
);
```
