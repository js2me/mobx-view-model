# Как работает useCreateViewModel

## TL;DR

Хук создаёт ViewModel один раз на fiber и привязывает её к React-жизненному циклу через **staging-модель, зеркалящую WIP→commit модель самого React**:

- **render-фаза**: VM создаётся и регистрируется в **staging-слое** стора (`defineStaged`) — видна render-time lookup'ам (`useViewModel`, `viewModels.get(...)`) через read-through, но НЕ является committed-записью.
- **commit-фаза**: effect того же fiber'а делает `commitStaged` — staging → committed. Fiber закоммичен ⇔ VM в сторе.
- **fiber отброшен React 19** → effect не вызван → promote не случился → staged-запись выметается sweep'ом после ближайшего commit'а (по epoch'ам) и в конечном счёте GC'ом (FinalizationRegistry по owner'у). Committed-стор orphan'ов не содержит **by construction** — чистить нечего.

Fallback-пути (SSR, no-store, кастомный стор без `defineStaged`) сохраняют старый механизм: eager-регистрация в render + **unconfirmed-creation tracking** (`Map<vm, store>` + `setTimeout(0)` из `confirmCreation`).

Reclaim (сохранение состояния VM при Suspense/lazy remount) **намеренно убран** — remount создаёт свежий VM. Это упрощение: больше нет `claimPendingVm`, ambiguous guard, payload-дискриминации.

---

## Ключевое архитектурное решение: read-through staging вместо eager-регистрации

Render-time store access по-прежнему обязателен: `useViewModel(class/ref/id)` и VM-компьютеды через `this.viewModels.get(...)` читают стор **во время render**, а children/siblings рендерятся ДО effect'а родителя.

Раньше это достигалось eager-записью прямо в committed-мапу в render — отсюда orphan'ы: fiber, discard'нутый React 19, уже зарегистрировал VM, но его `useEffect` не вызывается → зомби в сторе, которого надо вычищать эвристикой по таймеру.

Теперь стор имеет два слоя (как WIP- и current-деревья у React):

```
staging (per-store Map, НЕ observable)   ← defineStaged в render
committed (observable Map, как раньше)   ← commitStaged в effect
```

- **Чтения** (`get`/`has`/`getIds`/`getAll`) делают read-through: committed ∪ staging. Render-time lookup'и работают без изменений.
- **Committed-only читатели** (`mountedViewsCount`, `hasMountingVms`, `waitMount`, devtools-перечисления) staging не видят → отброшенные fiber'ы никогда не мелькают как зомби.
- **Promote** делает effect самого fiber'а — никаких глобальных свипов committed-состояния.

---

## Полный flow (staged path: client + store с `defineStaged`)

### 1. Вход: `!cache.current` (первый рендер fiber'а)

```
useCreateViewModel(HomePageVM, payload, { id: "home" })
  │
  ▼
cache.current === null?  ──►  ДА: идём по пути создания
  │
  ▼
1. Определить ID
   │  explicitId = rawCfg?.id
   │  или reactId из useId()  (isProd ? reactId : `${reactId}:${VM.name}`)
   │
   ▼
2. useStaging = client && store && typeof store.defineStaged === 'function'
   │
   ▼
3. instantiateVm → viewModels.defineStaged(config, cache)
   │  defineStaged = get-or-create по committed ∪ staging:
   │    - committed/staged id уже есть → вернуть существующий (sharing)
   │    - иначе create + link(anchors) + init(config + store)
   │      + stagedViewModels.set(id, { vm, epoch })
   │      + FinalizationRegistry.register(cache, { store, id, vm }, vm)
   │  Без стора: factory(config) + instance.init(config) — staging нет
   │
   │  Важно: VM видна lookup'ам, но НЕ в committed-мапе.
   │
   ▼
4. bindModel(model, payload, parentViewModel)  (client)
   │  → ViewModelSimple: parentViewModel + setPayload
   │  (mount на клиенте НЕ вызывается в render — ждёт commit effect)
   │
   ▼
5. creationEntry = undefined  (staging не нуждается в unconfirmed-трекинге;
   │                          registerUnconfirmed остаётся только для
   │                          no-store / fallback-сторов)
   ▼
6. cache.current = { vm, config, promise, isSSR, staged: true, fn }
  │
  ▼
7. return vm
```

### 2. Повторный рендер: `cache.current` уже есть

```
  │
  ▼
1. model.setPayload?.(payload)
   │
   ▼
2. Проверить: VM отвалился от store или unmounted?
   │  isDetachedFromStore(vm, store) — has() read-through: staged тоже виден
   │  vm.lifecycleState === 'unmounted' / 'unmounting'
   │
   │  Зачем: Suspense может скрыть дерево → effect cleanup →
   │  unmountVm → store.unmount. Когда Suspense снова показывает
   │  дерево на ТОМ ЖЕ fiber (cache выжил), VM уже unmounted/detached.
   │  Нужно revive.
   │
   ▼
3. needsRevive?  → reattachVm(vm, config) + bindLifecycle (mount заново)
   │  (reattachVm = define({…config, factory: () => vm}) — committed-direct,
   │   как и раньше; revive-путь редкий)
   otherwise     → REUSE VM (ничего не делаем)
   │
   ▼
4. return vm
```

### 3. Commit effect: `cache.current.fn`

```
useLayoutEffect(fn, [])  — вызывается ОДИН раз при mount fiber'а
  │
  ▼
1. confirmCreation(creationEntry) — только для fallback-путей
   │
   ▼
2. staged? → commitStaged(config.id, vm)
   │  → staging.delete + committed.set + attachVMConstructor
   │  → scheduleStagedSweep(): setTimeout(0) с epochAtCommit
   │     sweep удаляет staged-записи с epoch <= epochAtCommit
   │     (их fiber'ы либо закоммичены → уже промоутнуты, либо отброшены)
   │
   ▼
3. Revive-проверка (между render и effect VM могли unmount'нуть):
   │  isDetachedFromStore(vm, store)? → reattachVm + mount
   │  иначе !isMounted? → mount
   │
   ▼
4. SSR: lifecycleState → 'hydrated' (если mounted + isSSR)
   │
   ▼
5. return cleanup function
   │  → unmountVm(vm, store) — НЕМЕДЛЕННО, без grace period
   │  → store.unmount(vm): remove из committed+staging + vm.unmount()
   │  → reclaim'а НЕТ: Suspense remount создаст свежий VM
```

---

## Механизм защиты: staging + sweep + GC (React 19 discarded fibers)

```
Проблема:  React 19 создаёт два fiber для одного компонента в одном
           render pass (Suspense boundary). Первый fiber отбрасывается —
           его useEffect НИКОГДА не вызывается.

Раньше:    VM регистрировалась в committed в render → orphan в сторе →
           unconfirmed-Map + setTimeout(0) вычищал зомби эвристически.

Теперь:    VM регистрируется в STAGING в render. Отброшенный fiber
           никогда не делает promote → committed-стор чист by construction.

Sweep:     commitStaged планирует setTimeout(0) с epochAtCommit =
           текущему stagedEpoch. Sweep удаляет staged-записи с
           epoch <= epochAtCommit: у всех fiber'ов этого render pass
           эффекты уже отработали (промоутили) или не отработают никогда
           (отброшены). Записи более поздних проходов (epoch больше)
           не трогаем.

           Sweep БЕЗОПАСЕН для живых fiber'ов: удаление staged-записи
           — это потеря видимости, не убийство инстанса (unmount НЕ
           вызывается). Живой fiber при своём commit'е сам себя
           зарегистрирует: commitStaged(id, instance) пишет committed
           из cache'а хука (self-heal).

GC belt:   defineStaged регистрирует owner (ref хука, живёт ровно столько,
           сколько fiber) в FinalizationRegistry. Owner собран →
           dropStaged(id, vm) с identity-check (защита от reuse id).
           Детерминированность не требуется — это только memory-backstop.
```

### Почему reclaim убран

Раньше был `claimPendingVm` (искать pending-unmount VM по class+parent+store+payload и забрать обратно при remount). Это сохраняло состояние VM при Suspense remount. Но:

- Ambiguous guard: два sibling'а одного класса с одинаковым payload → нельзя отличить "свой" от "чужого" → reclaim не срабатывает → данные всё равно терялись.
- React fiber identity одноразовая: новый fiber имеет новый `useId`, не знает, что он "реинкарнация" старого → reclaim по auto-id невозможен.
- Сложность: payload-дискриминация, FIFO-подходы, edge-cases.

Reclaim убран. Suspense/lazy remount создаёт свежий VM. Это проще и предсказуемее. Важно различать два разных сценария, которые легко спутать:

- **Предотвращение two-fiber дубликации** (два fiber'а для одного компонента в **одном** render pass): стабильный `config.id`/`generateId` помогает — `defineStaged` get-or-create по committed ∪ staging возвращает **общий инстанс** → 1 VM вместо 2.
- **Сохранение состояния через Suspense unmount→remount** (fiber **размонтировался**, потом новый fiber пересоздаётся): стабильный id **НЕ помогает**. Cleanup вызывает `unmountVm` → `store.unmount` (VM удаляется из стора **сразу**, без grace), и на remount `define(id)` не находит VM → свежий инстанс. Надёжно сохранить стейт тут можно только:
  - `RouteViewGroup` `suspense` prop — локальный Suspense ловит suspend ребёнка, страница **не размонтируется** вообще; ИЛИ
  - revive — если React **сохраняет** fiber через hide/show (тот же инстанс пере-регистрируется через `reattachVm` + mount). Зависит от внутреннего решения React, не гарантировано.

---

## Пример: orphan-сценарий React 19 шаг за шагом (staging)

Компонент `<Page/>` (через `withViewModel`) внутри `<Suspense>`. React 19 в одном render pass создаёт **два fiber'а** для `Page`, один discard'ит.

```
RENDER PASS
├─ Fiber A (будет отброшен):
│    useCreateViewModel → defineStaged(":r1:PageVM", cacheA)
│    staging { ":r1:" → { VM_A, epoch: 1 } }   ← committed ПУСТ
│    registry.register(cacheA, { store, ":r1:", VM_A })
│
└─ Fiber B (выживет):
     useCreateViewModel → defineStaged(":r2:PageVM", cacheB)
     staging { ":r1:", ":r2:" → { VM_B, epoch: 2 } }

React discard'ит Fiber A, коммитит Fiber B.

COMMIT (layout effect у Fiber B; у Fiber A — НИКОГДА):
  cache_B.fn():
    commitStaged(":r2:", VM_B)
      → staging.delete(":r2:") + committed.set(":r2:", VM_B)
      → scheduleStagedSweep(epochAtCommit = 2)

SWEEP (setTimeout(0)):
  staging { ":r1:" → { VM_A, epoch: 1 } }, epoch 1 <= 2
    → drop (БЕЗ unmount — VM_A никогда не маунтилась на клиенте)
  staging {}

GC (когда cacheA соберётся):
  FinalizationRegistry → dropStaged(":r1:", VM_A) → уже удалено, no-op.

ИТОГ: committed содержит только VM_B. VM_A никогда не была committed —
      нечего чистить, нечему течь. ✅
```

Если бы Fibers A и B **разделяли** один инстанс (одинаковый explicit `id` → `defineStaged` вернул бы тот же VM из staging): одна staged-запись, выживший fiber её промоутит, finalizer отброшенного — no-op по identity-check.

---

## Инварианты

1. **Staged-слой НЕ observable** — staging-записи пишутся в render и не должны нотифицировать observer'ов стора. Committed-мапа observable, как раньше.

2. **`commitStaged` вызывается только из commit-фазы (effect), никогда из render** — sweep планируется внутри `commitStaged`; его `setTimeout(0)` должен встать в очередь после React-эффектов, иначе снимет staged-записи ещё не закоммиченных fiber'ов текущего pass'а. (Само по себе не фатально — живой fiber self-heal'ится своим `commitStaged(id, instance)` — но окно read-through просадки не нужно.)

3. **Sweep/drop никогда не вызывают `unmount`** — удаление staged-записи это потеря видимости, а не убийство инстанса. Убийство чужого/живого VM невозможно by construction.

4. **`dropStaged` только по identity** (`staged.get(id)?.vm === instance`) — защита от reuse id: протухший finalizer не должен снести новую VM под тем же id.

5. **Promote идемпотентен** — `commitStaged` для уже committed VM это no-op (важно для StrictMode double-effect и shared explicit id).

---

## Визуализация: полный жизненный цикл VM (staging)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RENDER PHASE (sync)                            │
│                                                                     │
│  1. instantiateVm → viewModels.defineStaged(config, cache)         │
│     └── existing id (committed ∪ staged)? → SAME instance (sharing)│
│     └── иначе: create + link + init + staged.set + register GC     │
│     └── VM видна lookup'ам, НЕ в committed                         │
│                                                                     │
│  2. bindModel (client) — setPayload/parentViewModel                 │
│     mount НЕ вызывается (ждёт commit)                               │
│                                                                     │
│  3. cache.current = { vm, config, staged: true, fn }               │
│                                                                     │
│  4. return vm                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                      COMMIT PHASE (layout effect)                   │
│                                                                     │
│  1. staged? → commitStaged(id, vm): staging → committed,           │
│     attachVMConstructor, scheduleStagedSweep(epoch)                │
│                                                                     │
│  2. detached? → reattachVm + mount (revive); !mounted? → mount     │
│                                                                     │
│  3. SSR → lifecycleState = 'hydrated'                              │
│                                                                     │
│  cleanup: unmountVm → store.unmount (НЕМЕДЛЕННО, без grace)        │
├─────────────────────────────────────────────────────────────────────┤
│                      SWEEP (setTimeout, per store)                  │
│                                                                     │
│  Срабатывает после commit'а; сносит staged-записи этого render     │
│  pass'а (epoch <= epochAtCommit) — их fiber'ы отброшены.           │
│  Живые self-heal'ятся при своём commit'е.                          │
├─────────────────────────────────────────────────────────────────────┤
│                      GC (FinalizationRegistry)                      │
│                                                                     │
│  Owner (ref хука) собран → dropStaged по identity.                 │
│  Memory-backstop; детерминированность не требуется.                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Почему каждое решение именно такое

| Решение | Почему так, а не иначе |
|---------|----------------------|
| Staging + read-through (а не eager committed в render) | Render-time lookup'и (`useViewModel(class)`, `this.viewModels.get(...)` в компьютедах) обязаны работать в render — children рендерятся до effect'а родителя. Read-through сохраняет это, не загрязняя committed-стор работой отброшенных fiber'ов. |
| Promote из effect самого fiber'а (а не глобальный sweep committed) | Единственный достоверный commit-сигнал — effect этого fiber'а. Нет committed-записей без живого fiber'а → orphan cleanup committed-состояния не нужен вообще. |
| Sweep по epoch'ам, `setTimeout(0)` из `commitStaged` | После commit'а pass'а все его fiber'ы либо промоутились, либо мертвы. Epoch отсекает записи более поздних проходов. `queueMicrotask` нельзя: React 19 yield'ит к микротаскам между fiber'ами. |
| Sweep без `unmount`, self-heal через `commitStaged(id, instance)` | Удаление staged-записи — потеря видимости, не убийство. Старый orphan cleanup убивал инстанс (`store.unmount`) и поэтому был хрупок к таймингам; здесь худшее последствие гонки — transient lookup-gap до commit'а живого fiber'а. |
| `FinalizationRegistry` по owner=ref хука | GC-backstop для памяти: ref живёт ровно столько, сколько fiber. Детерминизм не нужен — корректность даёт sweep. |
| Fallback `registerUnconfirmed`/`setTimeout` для no-store и старых сторов | Без стора VM не pollut'ит глобальное состояние, но `init` в render может подписаться на внешние observable → таймер остаётся safety-net'ом. Кастомные сторы без `defineStaged` — полный старый путь. |
| mount в render на сервере | SSR: `willMount` грузит данные, `use(promise)` саспендит. На сервере нет commit-фазы — staging не нужен, стор выбрасывается после запроса. |
| `reattachVm` (define+factory) для revive | Revive пере-регистрирует отвалившийся VM через `viewModels.define({...config, factory: () => vm})`. Хелпер живёт в react-пакете — core store API остаётся чистым от react-специфики. |
| Reclaim убран | React fiber identity одноразовая → reclaim по auto-id невозможен; ambiguous guard всё равно терял данные при одинаковых payload. Suspense remount создаёт свежий VM — проще и предсказуемее. |

---

## Известные ограничения staging-модели

1. **VM, рутующая себя через `reaction`/`autorun` на ВНЕШНИЕ observable в конструкторе или `init`**, не будет собрана GC → finalizer не сработает. Sweep всё равно уберёт её из staging (видимости не будет), но память освободится только с dispose подписки. Правило: подписки на внешние сторы — в `mount`/`didMount` (для `ViewModelBase` это естественное место), либо с `signal: this.unmountSignal`.
2. **Внешние (не-React) читатели стора** не видят VM между render и commit — осознанное ужесточение, зеркалит «uncommitted UI невидим». `mountedViewsCount`/`hasMountingVms`/`waitMount` — committed-only.
3. **Revive-путь** (`reattachVm`) пишет в committed из render — как и раньше; это редкий путь пережившего fiber'а, и он не промоутится через staging.

---

## Почему `useSyncExternalStore` не решает проблему

### Проблема orphaned VM — это проблема lifecycle, а не consistency

`useSyncExternalStore` (USES) решает задачу **tearing** (рассинхрон снапшота в concurrent mode). Проблема orphaned VM в другом: **React создаёт fiber, вызывает render, но потом отбрасывает fiber — и никогда не вызывает ни `useEffect`, ни `subscribe` от USES.**

```
Fiber создан → render() вызван → USES.getSnapshot() вызван →
Fiber отброшен → ❌ USES.subscribe() НИКОГДА не вызван
                          ❌ useEffect НИКОГДА не вызван
```

`subscribe` в USES — это по сути тот же `useEffect`, только синхронный. Если fiber отброшен, **ни один callback не вызывается**.

### Почему отложенная регистрация (через USES/effect) тоже не работает

Идея «создать VM в render, а зарегистрировать в сторе только в effect» (через USES или useEffect) устранила бы orphan-утечку в сторе. Но она **ломает render-time store access**: `useViewModel(class/ref/id)` и VM-компьютеды через `this.viewModels.get(...)` читают стор во время render, а children рендерятся до effect'а родителя → VM ещё не в сторе → lookup падает.

Staging-модель снимает это противоречие: read-through даёт render-time видимость, а commit-gating не пускает в committed-стор работу отброшенных fiber'ов.

### Что USES всё-таки делает в проекте

USES используется в `withViewModel` HOC для трекинга `isMounted`:

```ts
// packages/react/src/hoc/with-view-model.tsx
useSyncExternalStore(
  (onStoreChange) => reaction(
    () => !isViewModel(current) || current.isMounted,
    (ready) => onStoreChange(),
  ),
  () => current.isMounted !== false,
)
```

Это реактивный ререндер при изменении observable-состояния. Но это про re-render, а не про lifecycle — orphan-проблема через USES не решается.

| Аспект | USES помогает? |
|--------|---------------|
| Orphaned VM (fiber отброшен) | ❌ Нет — `subscribe` не вызывается для discarded fiber |
| Отложенная регистрация | ❌ Нет — ломает render-time store access |
| Tearing prevention | ✅ Да — но это уже решено через `observer` |
| Re-render при isMounted | ✅ Да — уже используется в HOC |

**Проблема — не в том, какой хук использовать, а в том, что React не даёт сигнала о смерти fiber'а.** Поэтому committed-стор строится только из commit-сигналов (effect'ов), а всё некоммиченное живёт в staging и умирает вместе с fiber'ом.

---

## Карта файлов

| Файл | Роль |
|------|------|
| `packages/react/src/hooks/use-create-view-model.ts` | Хук. `defineStaged` в render (staged path), `commitStaged` в effect, `reattachVm` (revive), immediate `unmountVm` в cleanup; fallback — `registerUnconfirmed` |
| `packages/react/src/hooks/pending-vm-unmount.ts` | Fallback-механизм для no-store и кастомных сторов без staging: `registerUnconfirmed`/`confirmCreation`/`unmountVm`/`scheduleOrphanCleanup` (`Map<vm, store>` + `setTimeout(0)`) |
| `packages/react/src/hoc/with-view-model.tsx` | HOC. `useCreateViewModel` + `useSyncExternalStore` на `isMounted` (Fallback-gating) + `ActiveViewModelProvider` (parent-child контекст) |
| `packages/react/src/hooks/use-view-model.ts` | `useViewModel(lookup)` — store-lookup во время render (`viewModels.get`). Работает через read-through staging |
| `packages/core/src/view-model/view-model.store.base.ts` | Store: `define`/`defineStaged`/`commitStaged`/`dropStaged`, `sweepStaged` по epoch'ам, `FinalizationRegistry`, `create`, `connect`, `unmount`, `link`. НЕ знает про React |
| `packages/core/src/view-model/view-model.base.ts` | `ViewModelBase`: lifecycle (`mount`/`unmount`/`isMounted`/`lifecycleState`), `unmountSignal`. `init` отсутствует (конструктор всё ставит) |

**Слои:** staging-механика живёт в core-сторе (per-store, без React-специфики); react-пакет только выбирает `defineStaged` vs `define` и зовёт `commitStaged` из commit-эффекта.

---

## Что делать потребителю

1. **Гейтить на `isMounted`**: `withViewModel` делает это сам (Fallback пока `!isMounted`); при прямом использовании хука — `if (!vm.isMounted) return null` (как `OnlyViewModel`).
2. **Сохранение состояния при Suspense remount** — reclaim'а больше нет, remount создаёт свежий VM. Важно различать:
   - **Two-fiber дубликация** (два fiber'а в одном pass): стабильный `config.id`/`generateId` помогает — `defineStaged` вернёт общий инстанс → 1 VM вместо 2.
   - **Suspense unmount→remount** (fiber размонтировался, потом новый): стабильный id **НЕ спасает** — cleanup сразу удаляет VM из стора, remount создаёт свежий. Надёжно только `RouteViewGroup` `suspense` prop (не размонтировать) или revive (если React сохраняет fiber).
3. **Дубликаты `id`** — два компонента с одним explicit `id` разделяют один инстанс (get-or-create). Это легально, но cleanup/unmount одного влияет на общий VM — лучше уникальные id.
4. **Подписки на внешние observable** — в `mount`/`didMount`, не в конструкторе/`init` (см. «Известные ограничения» п.1).

---

## Проверка

- `packages/core`: unit-тесты staging (`defineStaged`/`commitStaged`/`dropStaged`/sweep/identity-guard) — `view-model.store.base.test.ts`.
- `packages/react`: весь сьют гоняется по staged-пути (store из core-исходников всегда staging-capable) + `staged-commit.test.tsx` (read-through в render, discarded fiber не оставляет committed-зомби).
- Регрессии `tests/react-regressions/react18` и `react19` — зелёные (единственный падающий тест `sibling-cross-claim > remount with an equal payload reclaims the same instance` падает и на базовом коммите — это протухший тест эпохи удалённого reclaim).
