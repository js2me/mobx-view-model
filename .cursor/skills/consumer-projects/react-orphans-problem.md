# Как работает useCreateViewModel

## TL;DR

Хук создаёт ViewModel один раз на fiber, привязывает её к React-жизненному циклу и защищает от проблемы orphaned VM (React 19 discard'ит fiber → его `useEffect` не вызывается → VM остаётся в сторе). Защита построена на **unconfirmed-creation tracking**: VM регистрируется + маунтится в render, а `useEffect` подтверждает, что fiber закоммичен. Кто не подтверждён — вычищается через `setTimeout(0)`.

Reclaim (сохранение состояния VM при Suspense/lazy remount) **намеренно убран** — remount создаёт свежий VM. Это упрощение: больше нет `claimPendingVm`, ambiguous guard, payload-дискриминации.

---

## Ключевое архитектурное решение: регистрация и mount в render

И mount, и регистрация в сторе происходят **в render-фазе**, не в effect. Это не случайно — это требование двух паттернов:

1. **SSR `use(promise)`**: `willMount` должен выполниться в render, чтобы сервер рендерил контент с данными. Перенос mount в effect ломает SSR.
2. **Render-time store access**: `useViewModel(class/ref/id)` и VM-компьютеды через `this.viewModels.get(...)` читают стор **во время render**. Children/siblings рендерятся ДО effect'а родителя — значит VM должна быть в сторе уже в render. Отложенная регистрация (в effect) ломает все эти lookup'и.

Цена: fiber, discard'нутый React 19, уже зарегистрировал + смонтировал VM, но его `useEffect` не вызывается → VM orphan. Этот orphan вычищается механизмом ниже.

---

## Полный flow

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
2. instantiateVm → viewModels.define(config)
   │  define = get-or-create по id:
   │    - если id уже в сторе → вернуть существующий экземпляр (sharing)
   │    - иначе create + connect (init + регистрация в сторе)
   │  Без стора: factory(config) + instance.init(config)
   │
   │  Важно: VM УЖЕ в сторе после этого шага (в render, не в effect).
   │
   ▼
3. bindLifecycle(model, payload, parentViewModel)
   │  → ViewModelSimple: parentViewModel + setPayload
   │  → vm.mount() если не mounted (willMount, может вернуть Promise)
   │
   ▼
4. registerUnconfirmed(vm, store)
   │  → Map<vm, store>.set(vm, store)
   │  → ключ = VM instance → identity-dedup (два fiber'а с одним id
   │    через define получают один экземпляр → одна запись)
   │  → НЕ планирует setTimeout! (планирование в confirmCreation)
   │
   ▼
5. Сохранить в cache.current = { vm, config, promise, isSSR, creationEntry, fn }
  │
  ▼
6. return vm
```

### 2. Повторный рендер: `cache.current` уже есть

```
  │
  ▼
1. model.setPayload?.(payload)
   │
   ▼
2. Проверить: VM отвалился от store или unmounted?
   │  isDetachedFromStore(vm, store) — VM выкинули из store
   │  vm.lifecycleState === 'unmounted' / 'unmounting'
   │
   │  Зачем: Suspense может скрыть дерево → effect cleanup →
   │  unmountVm → store.unmount. Когда Suspense снова показывает
   │  дерево на ТОМ ЖЕ fiber (cache выжил), VM уже unmounted/detached.
   │  Нужно revive.
   │
   ▼
3. needsRevive?  → reattachVm(vm, config) + bindLifecycle (mount заново)
   otherwise     → REUSE VM (ничего не делаем)
   │
   ▼
4. return vm
```

### 3. useEffect: `cache.current.fn` (mount effect)

```
useEffect(fn, [])  — вызывается ОДИН раз при mount fiber'а
  │
  ▼
1. confirmCreation(creationEntry)
   │  → Map.delete(vm)
   │  → если Map не пуст → scheduleOrphanCleanup()
   │     (setTimeout(0) запланирован ИЗ useEffect, не из render!)
   │
   ▼
2. Revive-проверка (между render и effect VM могли unmount'нуть):
   │  isDetachedFromStore(vm, store)?
   │    ДА → reattachVm(vm, config) + vm.mount()
   │         (reattachVm = viewModels.define({…config, factory: () => vm}) —
   │          re-register существующего инстанса; connect зовёт init повторно,
   │          но revive-путь редкий и это старое поведение)
   │  иначе isViewModel(vm) && !vm.isMounted?
   │    ДА → vm.mount()
   │
   ▼
3. SSR: lifecycleState → 'hydrated' (если mounted + isSSR)
   │
   ▼
4. return cleanup function
   │  → unmountVm(vm, store) — НЕМЕДЛЕННО, без grace period
   │  → store.unmount(vm): remove из store + vm.unmount()
   │  → reclaim'а НЕТ: Suspense remount создаст свежий VM
```

---

## Механизм защиты: Orphan Cleanup (React 19 discarded fibers)

```
Проблема:  React 19 создаёт два fiber для одного компонента в одном
           render pass (Suspense boundary). Первый fiber отбрасывается —
           его useEffect НИКОГДА не вызывается. Но VM уже зарегистрирован
           и смонтирован в render → остаётся в store навсегда
           (memory leak, zombie data).

Решение:   registerUnconfirmed(vm, store) — помечает VM как "не подтверждён"
           confirmCreation — вызывается из useEffect, подтверждает VM
           scheduleOrphanCleanup — setTimeout(0) после confirmCreation,
           чистит VM'ы чей useEffect не отработал (store.unmount: remove + unmount)

           Ключ: setTimeout планируется из useEffect (confirmCreation),
           НЕ из render! Иначе setTimeout(0) срабатывает раньше React-эффектов
           (он был поставлен в очередь раньше MessageChannel).

Dedup:     Map<vm, store> с ключом = VM instance. Два fiber'а, разделяющих
           один экземпляр через viewModels.define (одинаковый explicit id),
           получают одну запись. Один confirmCreation полностью удаляет VM
           из Map → orphan cleanup не убивает живой VM.
```

### Почему reclaim убран

Раньше был `claimPendingVm` (искать pending-unmount VM по class+parent+store+payload и забрать обратно при remount). Это сохраняло состояние VM при Suspense remount. Но:

- Ambiguous guard: два sibling'а одного класса с одинаковым payload → нельзя отличить "свой" от "чужого" → reclaim не срабатывает → данные всё равно терялись.
- React fiber identity одноразовая: новый fiber имеет новый `useId`, не знает, что он "реинкарнация" старого → reclaim по auto-id невозможен.
- Сложность: payload-дискриминация, FIFO-подходы, edge-cases.

Reclaim убран. Suspense/lazy remount создаёт свежий VM. Это проще и предсказуемее. Важно различать два разных сценария, которые легко спутать:

- **Предотвращение two-fiber дубликации** (два fiber'а для одного компонента в **одном** render pass): стабильный `config.id`/`generateId` помогает — `define` get-or-create возвращает **общий инстанс** → 1 VM вместо 2. Это работает и без reclaim.
- **Сохранение состояния через Suspense unmount→remount** (fiber **размонтировался**, потом новый fiber пересоздаётся): стабильный id **НЕ помогает**. Cleanup вызывает `unmountVm` → `store.unmount` (VM удаляется из стора **сразу**, без grace), и на remount `define(id)` не находит VM → свежий инстанс. Надёжно сохранить стейт тут можно только:
  - `RouteViewGroup` `suspense` prop — локальный Suspense ловит suspend ребёнка, страница **не размонтируется** вообще; ИЛИ
  - revive — если React **сохраняет** fiber через hide/show (тот же инстанс пере-регистрируется через `reattachVm` + mount). Зависит от внутреннего решения React, не гарантировано.

---

## Пример: orphan-сценарий React 19 шаг за шагом

Компонент `<Page/>` (через `withViewModel`) внутри `<Suspense>`. React 19 в одном render pass создаёт **два fiber'а** для `Page` (дубликат-fiber баг), один discard'ит.

```
RENDER PASS
├─ Fiber A (будет отброшен):
│    useCreateViewModel → define(":r1:PageVM") → VM_A в сторе + mount
│    registerUnconfirmed(VM_A) → Map { VM_A }
│    cache_A = { vm: VM_A, ... }
│
└─ Fiber B (выживет):
     useCreateViewModel → define(":r2:PageVM") → VM_B в сторе + mount
     registerUnconfirmed(VM_B) → Map { VM_A, VM_B }
     cache_B = { vm: VM_B, ... }

React discard'ит Fiber A, коммитит Fiber B.

COMMIT (useEffect у Fiber B; у Fiber A — НИКОГДА):
  cache_B.fn():
    confirmCreation(VM_B) → Map.delete(VM_B) → Map { VM_A } (size=1 > 0)
    → scheduleOrphanCleanup()  ← setTimeout(0) поставлен ИЗ effect'а

  (Fiber A effect не отработал → VM_A остаётся в Map)

ORPHAN CLEANUP (setTimeout(0), после всех effect'ов):
  Map { VM_A } → store.unmount(VM_A)  ← remove из store + vm.unmount()
  Map {}

ИТОГ: в сторе только VM_B (живой). VM_A (orphan) вычищен. ✅
```

Если бы Fibers A и B **разделяли** один инстанс (одинаковый explicit `id` → `define` вернул бы тот же VM): `Map` по ключу-instance дал бы **одну запись**, один `confirmCreation` очистил бы её → orphan cleanup не запустился бы → живой VM не убит. В этом суть identity-dedup.

---

## Сценарий: sibling'и с одинаковым payload (бывшая проблема reclaim)

```
<LayoutVM>
  <ChildVM payload={{}} />   ← fiber 0, VM_A (auto-id :r1:)
  <ChildVM payload={{}} />   ← fiber 1, VM_B (auto-id :r2:)
  <ChildVM payload={{}} />   ← fiber 2, VM_C (auto-id :r3:)
</LayoutVM>
```

Это был **худший кейс для старого reclaim**: `claimPendingVm` искал по `(class + parent + store + payload)` → три match → ambiguous guard → `null` → никто не реклаймился → данные терялись. Или (Scenario 2) один sibling в pending → 1 match → reclaim забирал **чужой** VM.

**Под новым дизайном проблемы нет:**
- Reclaim удалён → нет поиска по payload → нет ambiguity, нет grab'а чужого VM.
- Каждый sibling имеет **свой auto-id** → `define` создаёт **отдельный инстанс**. Orphan cleanup трекает по инстансу (`Map<vm, store>`), payload вообще не используется как ключ.
- Discard'нутые fiber'ы → их VM остаются в Map → `store.unmount`. Выжившие → `confirmCreation` → не тронуты. Каждый инстанс независимо.

Сценарий стал **строже и предсказуемее** старого: убраны и ambiguity, и wrong-VM-grab. Единственное последствие — на Suspense remount все sibling'ы теряют стейт (свежие VM), это принятый trade-off (см. «Почему reclaim убран» выше).

---

## Два инварианта (нарушить — убить живые VM)

1. **`Map<vm, store>` с ключом = VM instance, не `Set`** — identity-dedup. Два fiber'а, разделяющих VM через `define` (одинаковый id), получают одну запись; один `confirmCreation` очищает. С `Set` объектов было бы две записи → cleanup убил бы живой VM.

2. **`setTimeout(0)` ставится из `confirmCreation` (внутри `useEffect`), НЕ из `registerUnconfirmed` (render)** — `setTimeout(0)` из render встаёт в очередь раньше React'ового `MessageChannel` для эффектов → срабатывает ДО `useEffect` → убивает VM, чей effect ещё не подтвердил. Из effect'а — после.

---

## Визуализация: полный жизненный цикл VM

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RENDER PHASE (sync)                           │
│                                                                     │
│  1. instantiateVm → viewModels.define(config)                      │
│     └── existing id? → returns SAME instance (sharing)             │
│     └── VM УЖЕ в сторе (в render!)                                  │
│                                                                     │
│  2. bindLifecycle → vm.mount() (willMount, maybe Promise)          │
│                                                                     │
│  3. registerUnconfirmed → Map<vm, store>                           │
│     └── same VM? → одна запись (identity dedup)                    │
│     └── NO setTimeout here!                                        │
│                                                                     │
│  4. cache.current = { vm, config, creationEntry, fn }              │
│                                                                     │
│  5. return vm                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                      COMMIT PHASE (async)                          │
│                                                                     │
│  useEffect(fn):                                                     │
│  1. confirmCreation(creationEntry)                                  │
│     └── Map.delete(vm) → Map пуст? → отлично, нет orphan cleanup   │
│     └── Map НЕ пуст? → scheduleOrphanCleanup (setTimeout(0))       │
│                                                                     │
│  2. detached from store? → reattachVm (define+factory) + mount (revive) │
│     not mounted? → mount                                           │
│                                                                     │
│  3. SSR → lifecycleState = 'hydrated'                              │
│                                                                     │
│  cleanup: unmountVm → store.unmount (НЕМЕДЛЕННО, без grace)        │
├─────────────────────────────────────────────────────────────────────┤
│                      ORPHAN CLEANUP (setTimeout)                    │
│                                                                     │
│  Срабатывает ТОЛЬКО если:                                           │
│  - confirmCreation был вызван (из useEffect)                       │
│  - И после удаления остались незакоммиченные VM в Map              │
│                                                                     │
│  → store.unmount всех VM, чей useEffect не отработал               │
│    (truly orphaned — fiber был отброшен React'ом)                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Почему каждое решение именно такое

| Решение | Почему так, а не иначе |
|---------|----------------------|
| Регистрация в сторе в render (не в effect) | `useViewModel(class/ref/id)` и VM-компьютеды через `this.viewModels.get(...)` читают стор во время render. Children рендерятся до effect'а родителя → VM должна быть в сторе уже в render. Отложенная регистрация ломает эти lookup'и. |
| mount в render (не в effect) | SSR: `willMount` грузит данные, `use(promise)` саспендит. Перенос mount в effect ломает SSR + даёт Fallback-флеш для sync-mount. |
| `setTimeout(0)` для orphan cleanup | `queueMicrotask` срабатывает МЕЖДУ fiber'ами в одном render pass (React 19 yield'ит к микротаскам). `setTimeout(0)` гарантированно после всего render pass. |
| `setTimeout` из `confirmCreation`, НЕ из `registerUnconfirmed` | `setTimeout(0)` из render phase ставится в очередь раньше React'ового `MessageChannel` для эффектов. Срабатывает ДО useEffect → убивает живые VM. Из useEffect — ставится после, срабатывает после. |
| `Map<vm, store>` с ключом = VM instance | `viewModels.define(id)` с одинаковым id возвращает тот же объект. Map по ключу VM instance — один VM = одна запись (identity dedup). Два fiber'а, разделяющих VM, получают одну запись → один confirmCreation очищает. |
| `reattachVm` (define+factory) для revive | Revive пере-регистрирует отвалившийся VM через `viewModels.define({...config, factory: () => vm})`. Хелпер живёт в react-пакете — core store API остаётся чистым от react-специфики. `connect` зовёт `init` повторно (double-init для ViewModelSimple), но revive-путь редкий и это ровно старое поведение. |
| Reclaim убран | React fiber identity одноразовая → reclaim по auto-id невозможен; ambiguous guard всё равно терял данные при одинаковых payload. Suspense remount создаёт свежий VM — проще и предсказуемее. |

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

Текущий подход (регистрация в render + orphan cleanup) — единственный способ одновременно сохранить render-time store access и вычистить orphans.

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
| Замена setTimeout(0) | ❌ Нет — нет нового сигнала для обнаружения orphan'ов |

**Проблема — не в том, какой хук использовать, а в том, что React не даёт сигнала о смерти fiber'а.** Orphan cleanup через `unconfirmedByVm` + `setTimeout(0)` — единственный обходной путь при сохранении регистрации в render.

---

## Карта файлов

| Файл | Роль |
|------|------|
| `packages/react/src/hooks/use-create-view-model.ts` | Хук. Регистрация + mount в render, `registerUnconfirmed`, `confirmCreation` в effect, `reattachVm` (revive), immediate `unmountVm` в cleanup |
| `packages/react/src/hooks/pending-vm-unmount.ts` | `registerUnconfirmed`/`confirmCreation`/`unmountVm`/`scheduleOrphanCleanup`. `Map<vm, store>` + `setTimeout(0)` |
| `packages/react/src/hoc/with-view-model.tsx` | HOC. `useCreateViewModel` + `useSyncExternalStore` на `isMounted` (Fallback-gating) + `ActiveViewModelProvider` (parent-child контекст) |
| `packages/react/src/hooks/use-view-model.ts` | `useViewModel(lookup)` — store-lookup во время render (`viewModels.get`). Работает потому, что регистрация в render |
| `packages/core/src/view-model/view-model.store.base.ts` | Store: `define` (get-or-create+init+register), `create`, `connect`, `unmount`, `link`. НЕ знает про React |
| `packages/core/src/view-model/view-model.base.ts` | `ViewModelBase`: lifecycle (`mount`/`unmount`/`isMounted`/`lifecycleState`), `unmountSignal`. `init` отсутствует (конструктор всё ставит) |

**Слои:** core store чистый (никакой React-специфики). Вся lifecycle-логика (register+mount в render, orphan cleanup, revive, reclaim-удаление) — в react-пакете.

---

## Что делать потребителю

1. **Гейтить на `isMounted`** (теперь обязательнее): `withViewModel` делает это сам (Fallback пока `!isMounted`); при прямом использовании хука — `if (!vm.isMounted) return null` (как `OnlyViewModel`).
2. **Сохранение состояния при Suspense remount** — reclaim'а больше нет, remount создаёт свежий VM. Важно различать:
   - **Two-fiber дубликация** (два fiber'а в одном pass): стабильный `config.id`/`generateId` помогает — `define` вернёт общий инстанс → 1 VM вместо 2.
   - **Suspense unmount→remount** (fiber размонтировался, потом новый): стабильный id **НЕ спасает** — cleanup сразу удаляет VM из стора, remount создаёт свежий. Надёжно только `RouteViewGroup` `suspense` prop (не размонтировать) или revive (если React сохраняет fiber).
3. **Дубликаты `id`** — два компонента с одним explicit `id` разделяют один инстанс (`define` get-or-create). Это легально, но cleanup/unmount одного влияет на общий VM — лучше уникальные id.

---

## Проверка в реальных приложениях

Изменения (удаление reclaim, упрощённый orphan cleanup, `reattachVm` для revive) **визуально проверены** в двух потребительских приложениях:

- **gozon** — визуально работает ✅
- **githome** — визуально работает ✅

Orphan cleanup корректно вычищает discard'нутые fiber'ы, revive восстанавливает VM при Suspense hide/show на пережившем fiber, утечек и зомби-VM не наблюдается.
