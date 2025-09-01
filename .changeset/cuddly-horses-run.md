---
"mobx-view-model": major
---

removed all marked as deprecation properties and methods   

- Removed `config` property in `ViewModelParams` interface (renamed to `vmConfig`)   
- Removed `linkStore` method in `ViewModelSimple` interface (renamed to `attachViewModelStore`)   
- Removed type `ComponentWithLazyViewModel` (renamed to `VMLazyComponent`)   
- Removed type `ComponentWithViewModel` (renamed to `VMComponent`)  
- Removed `params` property in `ViewModelBase` class (renamed to `vmParams`)   