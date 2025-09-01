# Wrap in `observer()` all view components   

All your view components wrapped into [`withViewModel()` HOC](/react/api/with-view-model) are automatically wrapped in [`observer()` MobX HOC](https://mobx.js.org/api.html#observer).   
Because [`wrapViewsInObserver`](/api/view-models/view-models-config.html#wrapviewsinobserver) view model config option is enabled by default.  
