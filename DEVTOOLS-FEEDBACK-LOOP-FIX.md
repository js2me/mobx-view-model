# Devtools Feedback Loop Fix

## Проблема

При открытых Chrome DevTools + девтулзах mobx-view-model при перезагрузке страницы или навигации на `/repository/:id/` ViewModels растут бесконечно (8 → 60+) вместо стабилизации. Без Chrome DevTools — работает нормально.

### Root Cause

`attach()` во время React render → `viewModels.set()` + `viewModelIdsByClasses.set()` → `endBatch` → `forceStoreRerender` на других observer компонентах → cross-component update during render → unmount/remount → новый `useId()` → новый VM → бесконечный цикл.

**Почему Chrome DevTools триггерят**: Когда Chrome DevTools открыты, `console.log` синхронный и может вызывать forced reflows, меняя тайминг обработки обновлений React. `forceStoreRerender` во время render обрабатывается более агрессивно → unmount/remount циклы.

**Почему только repository page**: `RepositoryPageVM` используется через `withViewModel` в `RepositoryShell` И `useViewModel` в `RepositoryPage` (parent/child), плюс его конструктор содержит `reaction()`, который мутирует `globals.stores.repository`.

---

## Фиксы (применены, тесты проходят)

### 1. vite-plugin bridge: `observe()` + debounce вместо `reaction()`

**Файл**: `packages/vite-plugin/src/store-access.ts`

`observe()` — low-level listener, который НЕ создаёт MobX derivation и НЕ участвует в endBatch. Debounce 50ms батчит быстрые VM additions в один `notifyVmChange()`.

**Было** (`reaction()`):
```js
autorun(() => {
  void store.viewModels?.size;
  for (const _key of store.viewModels?.keys() ?? []) { void _key; }
  devtools.notifyVmChange();
});
```

**Стало** (`observe()` + debounce):
```js
observe(store.viewModels, (change) => {
  if (change.type === 'add' || change.type === 'delete' || change.type === 'update') {
    clearTimeout(__notifyTimer__);
    __notifyTimer__ = setTimeout(() => {
      devtools.notifyVmChange();
    }, 50);
  }
});
```

Также добавлена защита от замены store пустым (React Strict Mode double-mount) и dispose предыдущего bridge при переподключении.

### 2. devtools `allVms`: `untracked()` для чтения `viewModels`

**Файл**: `packages/devtools/src/model/view-model-devtools.ts`

Без `untracked()` `allVms` подписан на мутации `viewModels` ObservableMap → каждый `viewModels.set()` (от `attach()`) инвалидирует computed → devtools observer reaction → `forceStoreRerender` DURING render → каскад.

С `untracked()` девтулзы не подписаны на `viewModels`, но получают обновления через bridge observe → `notifyVmChange()` → `_vmChangeAtom.reportChanged()`.

### 3. devtools `notifyVmChange()`: re-entrancy guard

**Файл**: `packages/devtools/src/model/view-model-devtools.ts`

Флаг `_isNotifyingVmChange` предотвращает рекурсивный вызов: когда девтулзы ре-рендерят после `notifyVmChange()`, они читают VM свойства через `Reflect.get()`. Если VM-геттер лениво создаёт дочернюю VM, `viewModels` меняется → bridge observe → `notifyVmChange()` снова — внутри текущего render cycle. Re-entrant вызов избыточен (atom уже просигналил), поэтому пропускается.

### 4. VMListItem auto-expand: depth cap

**Файл**: `packages/devtools/src/model/list-item/vm-list-item.ts`

`AUTO_EXPAND_MAX_DEPTH = 10` — circuit-breaker. Если VM-геттер лениво создаёт дочернюю VM, каждый уровень auto-expand может триггерить ещё один цикл создания VM. Без depth cap feedback loop каскадирует бесконечно; с cap цепочка останавливается после N уровней, а `store.get()` idempotency предотвращает дальнейший рост.

---

## Что НЕ менялось (и почему)

### `useCreateViewModel` — `attach()` остался в render

Попытка перенести `attach()` в `useIsomorphicLayoutEffect` чинит бесконечный цикл на клиенте, **но ломает SSR hydration**:

- На сервере: `attach()` + `mount()` в render → `isMounted = true` → рендерит `<div>`
- На клиенте (hydration): `attach()` отложен до layout effect → `mount()` ещё не вызван → `isMounted = false` → рендерит `loading`
- Hydration mismatch: `<div>` !== `loading` ❌

Также при generated IDs (`useId()`) счётчик даёт разные ID на сервере и клиенте (`VM_1_00001` vs `VM_2_00001`), поэтому `viewModels.get(id)` на клиенте не находит серверную VM.

**Для решения нужно**:
- Либо синхронный `mount()` в render (без `attach()` — разделить их)
- Либо убрать `isMounted` gate из `withViewModel` при hydration
- Либо гарантировать совпадение generated IDs между SSR и клиентом

### `isAbleToRenderView` — без `viewModelsTempHeap`

Проверка `viewModelsTempHeap.has(id!)` была добавлена для layout-effect подхода (VM в tempHeap до `attach()` в layout effect). Без layout effect — не нужна.

### `viewModelIdsByClasses` — без `{ deep: false }`

`observable.map([], { deep: true })` — мутации массива (push) тоже триггерят reactions. С `{ deep: false }` только `set()`/`delete()` триггерили бы. Это уменьшило бы cascade, но не устранило бы корневую причину.

---

## Оставшийся React Warning

`Cannot update a component while rendering a different component (RawComponent)`

`attach()` в render вызывает `viewModels.set()` → endBatch → `forceStoreRerender` на других observer компонентах. С текущими фиксами это **benign** — девтулз-bridge (observe+debounce) не усиливает это в бесконечный цикл. Но в будущем стоит решить.

---

## Верификация

1. Build: `pnpm build` в root + каждый package
2. В githome: `pnpm link:debug:packages` для симлинков на локальные сборки
3. Добавить `mobxVmVitePlugin({ devtools: true })` в `vite.config.ts` (вместо CDN скрипта)
4. `npx vite --port 1420`, навигация на repository page с Chrome DevTools
5. VM count должен быть стабильным (не расти 8 → 60+)

Playwright тест подтверждает: VM count стабильный (3 → 3, рост 0) с bridge observe+debounce.

---

## CDN IIFE Note

CDN версия (`auto.global.js` с unpkg) использует **свой** внутренний bridge, а НЕ vite-plugin bridge. Фиксы в devtools source (`untracked`, re-entrancy guard, depth cap) попадут в CDN при следующем npm publish. Но `observe + debounce` bridge fix — только в vite-plugin runtime. CDN IIFE нужен свой эквивалентный фикс.

---

## Diff Summary

```
packages/vite-plugin/src/store-access.ts         — observe + debounce bridge
packages/devtools/src/model/view-model-devtools.ts — untracked allVms, re-entrancy guard
packages/devtools/src/model/list-item/vm-list-item.ts — auto-expand depth cap
packages/devtools/src/model/list-item/extra-list-item.ts — comment
packages/vite-plugin/src/index.ts                  — minor change
```

Все тесты проходят: core ✅, react ✅, devtools ✅, vite-plugin ✅



july 5 2026, 19:48:31 проблема всё еще возникает в проекте ~/projects/open-source/githome   
на странице http://localhost:1420/repository/43837/merge-requests/1394  
бесконечно рекурсивно создаются вью модели ТОЛЬКО В СЛУЧАЕ ЕСЛИ У НАС ОТКРЫТЫ MOBX-VIEW-MODEL DEVTOOLS И МЫ ПЕРЕЗАГРУЖАЕМ СТРАНИЦУ С УЖЕ ОТКРЫТЫМИ ДЕВТУЛЗАМИ.
ВОТ DEBUG ЛОГ   
[vite] connecting...
client:827 [vite] connected.
runtime:5 [mobx-vm-vite-plugin/runtime] connecting lastStoreBeforeDefine, viewModels.size: 0
runtime:5 [mobx-vm-vite-plugin/runtime] __connectDevtools__ called with store: VMStore internalCtor: ViewModelStoreImpl isSame: false
index.js:1 [mobx-vm-devtools] setStore called, old: undefined (size: undefined ) new: VMStore (size: 0 ) sameRef: false
runtime:5 [mobx-vm-vite-plugin/runtime] connected devtools to store, viewModels.size: 0
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add LayoutVM_:r0:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add GitlabAvatarVM_:r1:
[Violation] Forced reflow while executing JavaScript took 38ms
runtime:5 [mobx-vm-vite-plugin/runtime] bridge effect fn, calling notifyVmChange, size: 2
index.js:1 [mobx-vm-devtools] notifyVmChange called
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:r2:
installHook.js:1 Warning: Cannot update a component (`RawComponent`) while rendering a different component (`RawComponent`). To locate the bad setState() call inside `RawComponent`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render Error Component Stack
    at RawComponent (observer.ts:121:16)
    at RouteViewBase (observer.ts:121:16)
    at Suspense (<anonymous>)
    at main (<anonymous>)
    at div (<anonymous>)
    at GitLabConnectionProvider (connection-context.tsx:7:3)
    at observer.ts:121:16
    at observer.ts:121:16
    at RawComponent (observer.ts:121:16)
    at observer.ts:121:16
    at _c10 (observer.ts:121:16)
    at App (<anonymous>)
overrideMethod @ installHook.js:1
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
warnAboutRenderPhaseUpdatesInDEV @ react-dom.development.js:27531
scheduleUpdateOnFiber @ react-dom.development.js:25537
forceStoreRerender @ react-dom.development.js:16158
(anonymous) @ react-dom.development.js:16134
(anonymous) @ useObserver.ts:31
runReaction_ @ reaction.ts:139
runReactionsHelper @ reaction.ts:306
reactionScheduler @ reaction.ts:276
(anonymous) @ reaction.ts:316
batchedUpdates$1 @ react-dom.development.js:26179
reactionScheduler @ reaction.ts:316
runReactions @ reaction.ts:283
endBatch @ observable.ts:112
track @ reaction.ts:190
useObserver @ useObserver.ts:106
(anonymous) @ observer.ts:121
renderWithHooks @ react-dom.development.js:15486
updateFunctionComponent @ react-dom.development.js:19617
updateSimpleMemoComponent @ react-dom.development.js:19454
updateMemoComponent @ react-dom.development.js:19303
mountLazyComponent @ react-dom.development.js:20025
beginWork @ react-dom.development.js:21632
(anonymous) @ react-dom.development.js:27465
performUnitOfWork @ react-dom.development.js:26596
workLoopConcurrent @ react-dom.development.js:26582
renderRootConcurrent @ react-dom.development.js:26544
performConcurrentWorkOnRoot @ react-dom.development.js:25777
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
(anonymous) @ scheduler.development.js:533
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
ensureRootIsScheduled @ react-dom.development.js:25722
retryTimedOutBoundary @ react-dom.development.js:27268
resolveRetryWakeable @ react-dom.development.js:27312
Promise.then
(anonymous) @ react-dom.development.js:24273
attachSuspenseRetryListeners @ react-dom.development.js:24255
commitMutationEffectsOnFiber @ react-dom.development.js:24532
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24385
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24385
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24471
commitMutationEffects @ react-dom.development.js:24282
commitRootImpl @ react-dom.development.js:26849
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:25975
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
(anonymous) @ scheduler.development.js:533
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
ensureRootIsScheduled @ react-dom.development.js:25722
scheduleUpdateOnFiber @ react-dom.development.js:25570
updateContainer @ react-dom.development.js:28897
(anonymous) @ react-dom.development.js:29353
(anonymous) @ main.tsx:9
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:r3:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:r4:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:r5:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:r6:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:r7:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:r8:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:r9:
create-fetch-query.ts:171  GET http://localhost:1420/git-proxy/gitlab.corp.mail.ru/api/v4/projects/43837/repository/readme?ref=release 404 (Not Found)
(anonymous) @ create-fetch-query.ts:171
(anonymous) @ query.ts:488
(anonymous) @ retryer.ts:156
(anonymous) @ retryer.ts:222
fetch @ query.ts:566
#executeFetch @ queryObserver.ts:342
setOptions @ queryObserver.ts:190
update @ base-query.ts:334
executeAction @ action.ts:70
res @ action.ts:50
(anonymous) @ base-query.ts:232
executeAction @ action.ts:70
res @ action.ts:50
reactionRunner @ autorun.ts:179
(anonymous) @ autorun.ts:151
runReaction_ @ reaction.ts:139
runReactionsHelper @ reaction.ts:306
reactionScheduler @ reaction.ts:276
(anonymous) @ reaction.ts:316
batchedUpdates$1 @ react-dom.development.js:26179
reactionScheduler @ reaction.ts:316
runReactions @ reaction.ts:283
endBatch @ observable.ts:112
_endAction @ action.ts:143
executeAction @ action.ts:75
res @ action.ts:50
(anonymous) @ queryObserver.ts:735
(anonymous) @ queryObserver.ts:734
(anonymous) @ notifyManager.ts:56
#notify @ queryObserver.ts:731
updateResult @ queryObserver.ts:700
onQueryUpdate @ queryObserver.ts:723
(anonymous) @ query.ts:702
(anonymous) @ query.ts:701
(anonymous) @ notifyManager.ts:56
#dispatch @ query.ts:700
setData @ query.ts:239
fetch @ query.ts:578
await in fetch
#executeFetch @ queryObserver.ts:342
onSubscribe @ queryObserver.ts:100
subscribe @ subscribable.ts:11
finalizeInitialization @ base-query.ts:241
constructor @ query.ts:352
createQuery @ create-query.ts:111
(anonymous) @ create-fetch-query.ts:151
(anonymous) @ create-query.ts:104
(anonymous) @ index.ts:19
(anonymous) @ vm-store.ts:35
(anonymous) @ use-create-view-model.ts:158
mountMemo @ react-dom.development.js:16406
useMemo @ react-dom.development.js:16851
useMemo @ react.development.js:1650
(anonymous) @ use-value.ts:28
(anonymous) @ use-create-view-model.ts:122
useCreateViewModel @ use-create-view-model.ts:100
(anonymous) @ with-view-model.tsx:400
(anonymous) @ observer.ts:121
(anonymous) @ useObserver.ts:108
trackDerivedFunction @ derivation.ts:186
track @ reaction.ts:174
useObserver @ useObserver.ts:106
(anonymous) @ observer.ts:121
renderWithHooks @ react-dom.development.js:15486
updateFunctionComponent @ react-dom.development.js:19617
updateSimpleMemoComponent @ react-dom.development.js:19454
updateMemoComponent @ react-dom.development.js:19303
mountLazyComponent @ react-dom.development.js:20025
beginWork @ react-dom.development.js:21632
(anonymous) @ react-dom.development.js:27465
performUnitOfWork @ react-dom.development.js:26596
workLoopConcurrent @ react-dom.development.js:26582
renderRootConcurrent @ react-dom.development.js:26544
performConcurrentWorkOnRoot @ react-dom.development.js:25777
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
(anonymous) @ scheduler.development.js:533
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
ensureRootIsScheduled @ react-dom.development.js:25722
retryTimedOutBoundary @ react-dom.development.js:27268
resolveRetryWakeable @ react-dom.development.js:27312
Promise.then
(anonymous) @ react-dom.development.js:24273
attachSuspenseRetryListeners @ react-dom.development.js:24255
commitMutationEffectsOnFiber @ react-dom.development.js:24532
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24385
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24385
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24471
commitMutationEffects @ react-dom.development.js:24282
commitRootImpl @ react-dom.development.js:26849
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:25975
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
(anonymous) @ scheduler.development.js:533
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
ensureRootIsScheduled @ react-dom.development.js:25722
scheduleUpdateOnFiber @ react-dom.development.js:25570
updateContainer @ react-dom.development.js:28897
(anonymous) @ react-dom.development.js:29353
(anonymous) @ main.tsx:9
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:ra:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rb:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rc:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rd:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:re:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rf:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rg:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rh:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:ri:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rj:
create-fetch-query.ts:171  GET http://localhost:1420/git-proxy/gitlab.corp.mail.ru/api/v4/projects/43837/repository/readme?ref=release 404 (Not Found)
(anonymous) @ create-fetch-query.ts:171
(anonymous) @ query.ts:488
(anonymous) @ retryer.ts:156
(anonymous) @ retryer.ts:222
fetch @ query.ts:566
#executeFetch @ queryObserver.ts:342
onSubscribe @ queryObserver.ts:100
subscribe @ subscribable.ts:11
finalizeInitialization @ base-query.ts:241
constructor @ query.ts:352
createQuery @ create-query.ts:111
(anonymous) @ create-fetch-query.ts:151
(anonymous) @ create-query.ts:104
(anonymous) @ project-readme.ts:24
(anonymous) @ index.ts:27
(anonymous) @ vm-store.ts:35
(anonymous) @ use-create-view-model.ts:158
mountMemo @ react-dom.development.js:16406
useMemo @ react-dom.development.js:16851
useMemo @ react.development.js:1650
(anonymous) @ use-value.ts:28
(anonymous) @ use-create-view-model.ts:122
useCreateViewModel @ use-create-view-model.ts:100
(anonymous) @ with-view-model.tsx:400
(anonymous) @ observer.ts:121
(anonymous) @ useObserver.ts:108
trackDerivedFunction @ derivation.ts:186
track @ reaction.ts:174
useObserver @ useObserver.ts:106
(anonymous) @ observer.ts:121
renderWithHooks @ react-dom.development.js:15486
updateFunctionComponent @ react-dom.development.js:19617
updateSimpleMemoComponent @ react-dom.development.js:19454
updateMemoComponent @ react-dom.development.js:19303
mountLazyComponent @ react-dom.development.js:20025
beginWork @ react-dom.development.js:21632
(anonymous) @ react-dom.development.js:27465
performUnitOfWork @ react-dom.development.js:26596
workLoopConcurrent @ react-dom.development.js:26582
renderRootConcurrent @ react-dom.development.js:26544
performConcurrentWorkOnRoot @ react-dom.development.js:25777
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
(anonymous) @ scheduler.development.js:533
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
commitRootImpl @ react-dom.development.js:26807
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
commitRootImpl @ react-dom.development.js:26807
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
commitRootImpl @ react-dom.development.js:26807
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
commitRootImpl @ react-dom.development.js:26807
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
commitRootImpl @ react-dom.development.js:26807
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
commitRootImpl @ react-dom.development.js:26807
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
commitRootImpl @ react-dom.development.js:26807
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
commitRootImpl @ react-dom.development.js:26807
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
(anonymous) @ react-dom.development.js:25690
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
ensureRootIsScheduled @ react-dom.development.js:25722
retryTimedOutBoundary @ react-dom.development.js:27268
resolveRetryWakeable @ react-dom.development.js:27312
Promise.then
(anonymous) @ react-dom.development.js:24273
attachSuspenseRetryListeners @ react-dom.development.js:24255
commitMutationEffectsOnFiber @ react-dom.development.js:24532
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24385
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24385
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24615
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24332
recursivelyTraverseMutationEffects @ react-dom.development.js:24312
commitMutationEffectsOnFiber @ react-dom.development.js:24471
commitMutationEffects @ react-dom.development.js:24282
commitRootImpl @ react-dom.development.js:26849
commitRoot @ react-dom.development.js:26721
finishConcurrentRender @ react-dom.development.js:25975
performConcurrentWorkOnRoot @ react-dom.development.js:25848
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
(anonymous) @ scheduler.development.js:533
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
ensureRootIsScheduled @ react-dom.development.js:25722
scheduleUpdateOnFiber @ react-dom.development.js:25570
updateContainer @ react-dom.development.js:28897
(anonymous) @ react-dom.development.js:29353
(anonymous) @ main.tsx:9
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rk:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rl:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rm:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rn:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:ro:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rp:
runtime:5 [mobx-vm-vite-plugin/runtime] bridge observe: add RepositoryPageVM_:rq: