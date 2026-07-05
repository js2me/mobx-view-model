# Devtools Feedback Loop Fix

Журнал работы над бесконечным созданием ViewModels при открытых mobx-view-model devtools на githome.

---

## Итог (July 6, 2026)

**Проблема с бесконечным loop ViewModels — исправлена.**

Комбинация фиксов **Fix 1–7** (devtools bridge + deferred registry + untracked store reads) устраняет бесконечный рост VM на githome при открытых mobx-vm devtools.

**Подтверждено на githome** (devtools открыты по умолчанию):

| Сценарий | Статус |
|---|---|
| `/` | OK — VM count стабилен |
| `/repository/43837/` | OK — ~20 VM, без роста |
| Reload с открытыми devtools на `/repository/43837/merge-requests/1394` | OK — без `RepositoryPageVM_:r2` → `_:rq` |
| Навигация `/repository/43837/` → **Merge Requests** | OK — без delete/add loop |
| Навигация MR list → MR detail (`/merge-requests/1410`) | OK (Fix 8) — без blank page |

**Итоговое решение** (слои):

1. **Devtools** (Fix 1–4): `observe`+debounce bridge, `untracked` allVms, re-entrancy guard, auto-expand depth cap
2. **React hooks** (Fix 5): `untracked` для `viewModels.get()` в `useViewModel` / `useCreateViewModel`
3. **Store registry split** (Fix 6–7): `attach(model, { deferCommit: true })` в render + `attach(model, { commitOnly: true })` после commit; `queueMicrotask`; `isAbleToRenderView` untracked для map/tempHeap; deferred `attachVMConstructor`; live `getIds`

Benign warning `Cannot update a component while rendering` может по-прежнему мелькать (githome `RepositoryPageVM.reaction` → `globals.stores.repository`) — **на loop не влияет**.

---

При открытых Chrome DevTools + mobx-vm devtools ViewModels на странице репозитория растут бесконечно вместо стабилизации (~20 штук).

### Сценарии воспроизведения (githome, devtools открыты по умолчанию)

| Сценарий | Статус (Fix 1–7, verified July 6) |
|---|---|
| `/` | OK |
| `/repository/43837/` | OK |
| Reload с уже открытыми devtools на `/repository/43837/merge-requests/1394` | OK |
| Навигация `/repository/43837/merge-requests` → клик MR → `/merge-requests/1410` | OK (Fix 8) |

### Базовая цепочка (root cause)

```
attach() во время React render
  → viewModels.set() / viewModelIdsByClasses.set()
  → endBatch
  → forceStoreRerender на других observer-компонентах
  → cross-component update during render
  → unmount/remount
  → новый useId() (или detach/register cycle)
  → новый VM / delete+add loop
  → ∞
```

**Почему Chrome DevTools усиливают**: `console.log` синхронный → forced reflows → меняется тайминг React commit → remount-циклы не успевают стабилизироваться.

**Почему repository page**: githome использует паттерн `RepositoryShell = withViewModel(RepositoryPageVM)` + `RepositoryPage = useViewModel(RepositoryPageVM)` + nested routes (`MergeRequestsVM` как child). Конструктор `RepositoryPageVM` содержит `reaction()` → `globals.stores.repository.setProject()` синхронно при создании VM.

### Архитектура githome (контекст)

```
RouteView route={repositoryRoot} view={RepositoryShell}   ← withViewModel(RepositoryPageVM)
  RouteView route={repository} view={RepositoryPage}      ← useViewModel(RepositoryPageVM)
  RouteView route={mergeRequests} view={MergeRequestsPage} ← withViewModel(MergeRequestsVM)
  RouteView route={mergeRequest} view={MergeRequestPage}  ← withViewModel(MergeRequestPageVM)
```

---

## Хронология фиксов

### Fix 1 — vite-plugin bridge: `observe()` + debounce вместо `reaction()`

**Файл**: `packages/vite-plugin/src/store-access.ts`

`reaction()` создавал MobX derivation, участвующий в endBatch во время render. Заменён на `observe()` (low-level listener, без derivation) + debounce 50ms для `notifyVmChange()`.

Также: защита от замены store пустым (Strict Mode), dispose предыдущего bridge.

**Результат**: devtools-bridge больше не усиливает render-phase loop. Бесконечный рост VM на githome **не устранён** полностью.

---

### Fix 2 — devtools `allVms`: `untracked()` для чтения `viewModels`

**Файл**: `packages/devtools/src/model/view-model-devtools.ts`

`allVms` computed подписывался на host `ObservableMap` → каждый `viewModels.set()` инвалидировал computed → devtools observer → `forceStoreRerender` during render.

С `untracked()` обновления идут через bridge → `notifyVmChange()` → `_vmChangeAtom`.

---

### Fix 3 — devtools `notifyVmChange()`: re-entrancy guard

**Файл**: `packages/devtools/src/model/view-model-devtools.ts`

Флаг `_isNotifyingVmChange` — при re-render devtools чтение VM-геттеров могло снова вызвать `notifyVmChange()` внутри текущего цикла.

---

### Fix 4 — VMListItem auto-expand: depth cap

**Файл**: `packages/devtools/src/model/list-item/vm-list-item.ts`

`AUTO_EXPAND_MAX_DEPTH = 10` — circuit-breaker для lazy child VM creation через auto-expand в devtools UI.

---

### Fix 5 (July 5, 2026) — break render-phase store subscription chain

**Симптом**: `RepositoryPageVM_:r2` → `_:rq` при reload с devtools.

**Root cause**: `useViewModel(RepositoryPageVM)` подписывался на `viewModelIdsByClasses` через `getIds()` во время render другого компонента.

**Изменения**:

| Файл | Что |
|---|---|
| `packages/core/.../view-model.store.base.ts` | `viewModelIdsByClasses`: `deep: false`; immutable `set()` вместо `push`; `isAbleToRenderView` учитывает `tempHeap` |
| `packages/react/.../use-view-model.ts` | `untracked(() => viewModels.get(vmLookup))` |
| `packages/react/.../use-create-view-model.ts` | `untracked(() => viewModels.get(id))` в `useValue` |
| `packages/react/.../use-view-model.test.tsx` | Регрессия: shell + child `useViewModel(class)` → 1 VM |

**Не сработало для**: `untracked` на `isAbleToRenderView` в `with-view-model.tsx` — сломал async mount (54 теста).

**Результат на githome**: reload-цикл частично улучшен, но проблема сохранялась.

---

### Fix 6 (July 5, 2026) — defer `viewModels.set` to layout effect

**Симптом**: тот же reload-цикл + `Cannot update a component while rendering`.

**Root cause**: даже с `untracked` в hooks, `attach()` в render вызывал `viewModels.set()` → `forceStoreRerender` на sibling observers.

**Изменения**:

| Файл | Что |
|---|---|
| `packages/core/.../view-model.store.base.ts` | `attach({ deferCommit })` — mount + счётчик; `attach({ commitOnly })` — registry; default `attach()` = оба шага |
| `packages/react/.../use-create-view-model.ts` | render: `attach(..., { deferCommit: true })`; layout: `attach(..., { commitOnly: true })` |
| `packages/react/.../use-view-model.test.tsx` | Регрессия: shell + observer child + `reaction` в конструкторе VM |

**Результат на githome**:
- `/` и `/repository/43837/` — **OK**
- Reload с devtools — улучшено (новые id перестали расти бесконечно)
- Навигация → Merge Requests — **новый симптом**: delete/add одного id + `Maximum update depth exceeded`

---

### Fix 7 (July 5, 2026) — navigation loop: same VM id delete/add cycle

**Симптом** (после Fix 6, клик Merge Requests):

```
bridge observe: delete RepositoryPageVM_:r4:
bridge observe: add RepositoryPageVM_:r4:
... (бесконечно)

Found more than 1 view model with the same identifier
Maximum update depth exceeded
```

**Root cause**:

1. `registerAttachedViewModel` в layout effect → `viewModels.set` → `isAbleToRenderView` подписан на `viewModels.has` → remount → layout cleanup `detach` (delete) → setup `register` (add) → loop
2. `markToBeAttached` вызывал `attachVMConstructor` (`viewModelIdsByClasses.set`) **во время render** → stale/duplicate class ids при route transition
3. Stale ids в `viewModelIdsByClasses` после remount → warning «more than 1»

**Изменения**:

| Файл | Что |
|---|---|
| `packages/core/.../view-model.store.base.ts` | `isAbleToRenderView`: `viewModels`/`tempHeap` через `untracked()`, `mountingViews` — observed (async mount OK); `markToBeAttached` без `attachVMConstructor`; `getIds` — live filter + tempHeap scan по constructor; `registerAttachedViewModel` — always `attachVMConstructor` (idempotent) |
| `packages/react/.../use-create-view-model.ts` | `registerAttachedViewModel` через `queueMicrotask` + cancel flag в cleanup |
| `packages/react/.../use-view-model.test.tsx` | Регрессия: nested shell + child withViewModel (navigation-style rerender) |
| `packages/react/.../devtools-feedback-loop.regression.test.tsx` | Полный githome regression: navigation + `reaction` + registry churn guard |

**Результат на githome (verified)**: все сценарии из таблицы выше — OK. Бесконечный loop устранён.

---

### Fix 8 (July 6, 2026) — blank page on client navigation (MR list → MR detail)

**Симптом**: `/merge-requests` → клик на MR → `/merge-requests/1410` — пустая страница, `MergeRequestPageVM` нет в devtools. Reload — OK.

**Root cause**: `commitOnly` через `queueMicrotask` (Fix 7) — microtask мог отменяться cleanup layout effect до commit. VM оставалась только в `tempHeap` (devtools её не видит), `withViewModel` без fallback рендерил `null`.

**Fix**: синхронный `attach(instance, { commitOnly: true })` в `useIsomorphicLayoutEffect`. Безопасно после `untracked` в `isAbleToRenderView` (Fix 7).

**Тест**: `client navigation MR list → MR detail renders detail VM without reload`

---

## Текущий статус

### Решено

- [x] **Бесконечный loop ViewModels на githome** — Fix 1–7, verified July 6, 2026
- [x] Devtools bridge не участвует в endBatch (Fix 1)
- [x] Devtools panel не подписан на host `viewModels` (Fix 2–4)
- [x] Hooks не подписываются на store при render-read (Fix 5)
- [x] `viewModels.set` deferred из render phase (Fix 6)
- [x] Navigation delete/add loop (Fix 7)
- [x] 508 react + 110 core тестов проходят
- [x] Регрессионный тест `devtools-feedback-loop.regression.test.tsx` (githome-сценарий)

### Известные benign warnings (не блокируют)

`Cannot update a component while rendering a different component (RawComponent)`

Источник в githome: `RepositoryPageVM` constructor → `reaction(() => projectQuery.data, () => globals.stores.repository.setProject(project))` — синхронная мутация global store during VM creation + `flushPendingReactions` in `useCreateViewModel`.

**Потенциальный fix в githome** (не в библиотеке):

```typescript
reaction(
  () => this.projectQuery.data,
  (project) => {
    queueMicrotask(() => {
      if (project) globals.stores.repository.setProject(project);
    });
  },
);
```

### Что сознательно НЕ менялось

**Полный перенос `attach()` в layout effect** — ломает SSR hydration. Решение Fix 6: `attach({ deferCommit: true })` в render + `attach({ commitOnly: true })` после commit.

**`untracked` на всём `isAbleToRenderView` в with-view-model** — ломает async mount re-render (mountingViews не observed → fallback навсегда).

---

## Верификация

```bash
# mobx-vm-entities
pnpm build
pnpm --filter mobx-view-model test
pnpm --filter mobx-view-model-react test

# githome
cd ~/projects/open-source/githome
pnpm link:debug:packages
npx vite --port 1420
```

Чеклист (devtools открыты по умолчанию):

1. `http://localhost:1420/` — VM count стабилен
2. `http://localhost:1420/repository/43837/` — VM count ~20, стабилен
3. Reload на `/repository/43837/merge-requests/1394` — без роста `RepositoryPageVM`
4. Клик **Merge Requests** с `/repository/43837/` — без delete/add loop, без `Maximum update depth exceeded`

---

## Diff Summary (все фиксы)

```
packages/vite-plugin/src/store-access.ts              — Fix 1: observe + debounce bridge
packages/devtools/src/model/view-model-devtools.ts    — Fix 2–3: untracked allVms, re-entrancy guard
packages/devtools/src/model/list-item/vm-list-item.ts — Fix 4: auto-expand depth cap
packages/devtools/src/model/list-item/extra-list-item.ts
packages/devtools/src/model/utils/format-property-watch-value.ts — TS fix
packages/vite-plugin/src/index.ts

packages/core/src/view-model/view-model.store.base.ts — Fix 5–7: store registry split
packages/core/src/view-model/view-model.store.ts      — Fix 6: ViewModelAttachOptions on attach()
packages/core/src/view-model/view-model.store.types.ts

packages/react/src/hooks/use-view-model.ts            — Fix 5: untracked get
packages/react/src/hooks/use-create-view-model.ts     — Fix 5–7: untracked get, deferred registry
packages/react/src/hoc/with-view-model.tsx
packages/react/src/hooks/use-view-model.test.tsx      — Fix 5–7: regression tests
packages/react/src/hooks/devtools-feedback-loop.regression.test.tsx — githome feedback loop regression
```

---

## CDN IIFE Note

CDN версия (`auto.global.js`) использует **свой** bridge, не vite-plugin runtime. Fix 1 (`observe + debounce`) — только в vite-plugin. Fix 2–4 попадут в CDN при npm publish. CDN нужен эквивалентный bridge fix.

---

## Appendix: симптомы по итерациям (логи)

### Итерация 1 — reload, новые id каждый remount (до Fix 6)

```
bridge observe: add RepositoryPageVM_:r2:
Warning: Cannot update a component while rendering...
bridge observe: add RepositoryPageVM_:r3:
bridge observe: add RepositoryPageVM_:r4:
...
bridge observe: add RepositoryPageVM_:rq:
```

### Итерация 2 — navigation Merge Requests, один id delete/add (после Fix 6, до Fix 7)

```
bridge observe: add RepositoryPageVM_:r4:
Found more than 1 view model with the same identifier
bridge observe: delete RepositoryPageVM_:r4:
bridge observe: add RepositoryPageVM_:r4:
... (repeat)
Maximum update depth exceeded
```

### Итерация 3 — фактическое поведение после Fix 7 (verified)

```
bridge observe: add RepositoryPageVM_:r4:     ← один раз
bridge observe: add MergeRequestsVM_:r5:    ← один раз при navigation
bridge effect fn, calling notifyVmChange     ← debounced, без loop
```

Loop больше не воспроизводится.
