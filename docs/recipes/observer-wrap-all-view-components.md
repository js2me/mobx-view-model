# Wrap in `observer()` all view components

All view components passed to [`withViewModel()`](/react/api/with-view-model) / [`withPropsViewModel()`](/react/api/with-props-view-model) are automatically wrapped in [`observer()`](https://mobx.js.org/api.html#observer) from `mobx-react-lite`.

You do not need to wrap the render function in `observer()` yourself when using these HOCs.

When using [`useCreateViewModel`](/react/api/use-create-view-model) directly, wrap your component in `observer()` as usual.
