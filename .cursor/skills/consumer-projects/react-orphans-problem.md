# Как работает useCreateViewModel

## TL;DR

Хук создаёт ViewModel один раз на fiber, привязывает её к React-жизненному циклу и защищает от трёх проблем React 19: Suspense/lazy remount (fiber умирает → hook state теряется), duplicate fibers (два fiber для одного компонента) и orphaned VMs (fiber отброшен → useEffect cleanup не вызывается).

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
   │  explicitId = rawCfg?.id  (если передан config.id)
   │  или reactId из useId()   (если id не передан)
   │
   ▼
2. Попытаться reclaim'нуть pending VM
   │  explicitId != null?  → claimPendingVmById(id)
   │  explicitId == null?  → claimPendingVm(VM, parentId, store, payload)
   │
   │  Зачем: если fiber умер и React сразу пересоздал компонент
   │  (Suspense/lazy remount), старый VM ещё висит в pendingUnmounts
   │  с запланированным unmount через microtask. Мы отменяем unmount
   │  и забираем этот VM — он уже смонтирован, данные на месте.
   │
   ▼
3. Не нашли pending?  → Создать новый
   │  cancelPendingForVm(vmId) — отменить pending unmount для этого id
   │  instantiateVm(vmId, VM, payload, ...) → viewModels.define(config)
   │
   │  Важно: viewModels.define(id) возвращает СУЩЕСТВУЮЩИЙ экземпляр,
   │  если VM с таким id уже в store. Это ключевое поведение для
   │  orphan-дедупликации (см. ниже).
   │
   ▼
4. bindLifecycle(model, payload, parentViewModel)
   │  → vm.mount() если не mounted
   │  → vm.setPayload(payload) для ViewModelSimple
   │  → может вернуть Promise (async willMount)
   │
   ▼
5. registerUnconfirmedCreation(vm, VM, parentId, store)
   │  → добавляет VM в Map<VmInstance, UnconfirmedCreation>
   │  → если VM уже в Map (тот же объект!) — возвращает существующий entry (DEDUP)
   │  → НЕ планирует setTimeout! (планирование перенесено в confirmCreation)
   │
   ▼
6. Сохранить в cache.current
   │  { vm, promise, isSSR, creationEntry, fn: effectCallback }
   │
   ▼
7. return vm
```

### 2. Повторный рендер: `cache.current` уже есть

```
useCreateViewModel(HomePageVM, payload, { id: "home" })
  │
  ▼
cache.current !== null?  ──►  ДА: fiber уже владеет VM
  │
  ▼
1. model.setPayload?.(payload)  — обновить payload если изменился
   │
   ▼
2. Проверить: VM отвалился от store или unmounted?
   │  isDetachedFromStore(vm, store) — VM выкинули из store
   │  vm.lifecycleState === 'unmounted' / 'unmounting'
   │
   │  Зачем: Suspense может скрыть дерево → useEffect cleanup →
   │  scheduleVmUnmount → microtask → vm.unmount(). Когда Suspense
   │  снова показывает дерево, React вызывает рендер с тем же cache,
   │  но VM уже unmounted. Нужно revive.
   │
   ▼
3. needsRevive?  → reattachVm + bindLifecycle (mount заново)
   │  otherwise  → REUSE VM (ничего не делаем, всё ок)
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
   │  → удаляет VM из unconfirmedByVm Map
   │  → если Map не пуст → scheduleOrphanCleanup()
   │     (setTimeout(0) запланирован ИЗ useEffect, не из render!)
   │
   ▼
2. cancelPendingForVm(vm.id)
   │  → отменяет pending unmount для этого id
   │  (на всякий случай, если кто-то ещё запланировал unmount)
   │
   ▼
3. isDetachedFromStore(vm, store)?
   │  ДА → reattachVm + vm.mount()  (VM был убит между render и effect)
   │  НЕТ → vm.isMounted? нет → vm.mount()
   │
   ▼
4. SSR: lifecycleState → 'hydrated' (если нужно)
   │
   ▼
5. return cleanup function
   │  → scheduleVmUnmount(vm, VM, parentId, store)
   │  → добавляет VM в pendingUnmounts Set
   │  → планирует unmount через queueMicrotask
   │  → microtask может быть отменён (cancel) если VM reclaim'нут
```

---

## Три механизма защиты в pending-vm-unmount.ts

### Механизм 1: Pending Unmount (Suspense/lazy remount)

```
Проблема:  Suspense показывает fallback → компонент unmount →
           useEffect cleanup → но React сразу пересоздаёт компонент
           с новым fiber (useId меняется, useRef сбрасывается).

Решение:   Не unmount'ить VM сразу. Ставим в pendingUnmounts
           с unmount через queueMicrotask. Если за это время
           новый fiber приходит в useCreateViewModel — он
           claimPendingVm() забирает VM обратно, cancel'ит unmount.

           claimPendingVm — ищет по (VM class + parentId + store + payload)
           claimPendingVmById — ищет по (id + VM class + store)

           Payload-дискриминация: если два sibling'а одного VM класса
           (например, GitlabAvatarVM для двух авторов), payload
           отличает "свой" pending VM от "чужого". Если payload
           совпадает у двух — ambiguous guard возвращает null.
```

### Механизм 2: Orphan Cleanup (React 19 discarded fibers)

```
Проблема:  React 19 создаёт два fiber для одного компонента в одном
           render pass (Suspense boundary). Первый fiber отбрасывается —
           его useEffect cleanup НИКОГДА не вызывается. VM остаётся
           в store навсегда (memory leak, zombie data).

Решение:   registerUnconfirmedCreation — помечает VM как "не подтверждён"
           confirmCreation — вызывается из useEffect, подтверждает VM
           scheduleOrphanCleanup — setTimeout(0) после confirmCreation,
           чистит VM'ы чей useEffect не отработал

           Ключ: setTimeout планируется из useEffect, НЕ из render!
           Иначе setTimeout(0) срабатывает раньше React-эффектов
           (он был поставлен в очередь раньше MessageChannel).
```

### Механизм 3: Map Dedup (один VM = одна запись)

```
Проблема:  viewModels.define("home") возвращает СУЩЕСТВУЮЩИЙ экземпляр.
           Два fiber'а получают один и тот же объект VM. Если Set
           позволяет два entry для одного объекта, confirmCreation
           удаляет один entry, но второй остаётся → orphan cleanup
           убивает ЖИВОЙ VM.

Решение:   Map<VmInstance, UnconfirmedCreation> — один VM = одна запись.
           registerUnconfirmedCreation проверяет: VM уже в Map?
           → возвращает существующий entry (DEDUP). Оба fiber'а
           получают один и тот же creationEntry. Один confirmCreation
           полностью удаляет VM из Map.
```

---

## Визуализация: полный жизненный цикл VM

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RENDER PHASE (sync)                           │
│                                                                     │
│  1. claimPendingVm / claimPendingVmById                            │
│     └── reclaimed? → setPayload, skip creation                     │
│                                                                     │
│  2. instantiateVm → viewModels.define(config)                      │
│     └── existing id? → returns SAME instance (key dedup!)          │
│                                                                     │
│  3. bindLifecycle → vm.mount()                                     │
│                                                                     │
│  4. registerUnconfirmedCreation → Map<VmInstance, entry>           │
│     └── same VM? → DEDUP (return existing entry)                   │
│     └── NO setTimeout here!                                        │
│                                                                     │
│  5. cache.current = { vm, creationEntry, fn: effectFn }            │
│                                                                     │
│  6. return vm                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                      COMMIT PHASE (async)                          │
│                                                                     │
│  useEffect(fn):                                                     │
│  1. confirmCreation(creationEntry)                                  │
│     └── Map.delete(vm) → Map пуст? → отлично, нет orphan cleanup   │
│     └── Map НЕ пуст? → scheduleOrphanCleanup (setTimeout(0))       │
│                                                                     │
│  2. cancelPendingForVm(vm.id)                                       │
│                                                                     │
│  3. detached from store? → reattachVm + mount                      │
│     not mounted? → mount                                           │
│                                                                     │
│  4. SSR → lifecycleState = 'hydrated'                              │
│                                                                     │
│  cleanup: scheduleVmUnmount → queueMicrotask → vm.unmount()        │
│           (может быть cancel'd если VM reclaim'd)                  │
├─────────────────────────────────────────────────────────────────────┤
│                      ORPHAN CLEANUP (setTimeout)                    │
│                                                                     │
│  Срабатывает ТОЛЬКО если:                                           │
│  - confirmCreation был вызван (из useEffect)                       │
│  - И после удаления остались незакоммиченные VM в Map              │
│                                                                     │
│  → unmount всех VM, чей useEffect не отработал                     │
│    (truly orphaned — fiber был отброшен React'ом)                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Почему каждое решение именно такое

| Решение | Почему так, а не иначе |
|---------|----------------------|
| `queueMicrotask` для pending unmount | Быстрый — unmount происходит в том же таске. Если React пересоздаёт fiber, claimPendingVm успевает отменить. |
| `setTimeout(0)` для orphan cleanup | `queueMicrotask` срабатывает МЕЖДУ fiber'ами в одном render pass (React 19 yield'ит к микротаскам). `setTimeout(0)` гарантированно после всего render pass. |
| `setTimeout` из `confirmCreation`, НЕ из `registerUnconfirmedCreation` | `setTimeout(0)` из render phase ставится в очередь раньше React'ового `MessageChannel` для эффектов. Срабатывает ДО useEffect → убивает живые VM. Из useEffect — ставится после, срабатывает после. |
| `Map<VmInstance, entry>` вместо `Set<entry>` | `viewModels.define(id)` с одинаковым id возвращает тот же объект. Set позволяет два entry для одного объекта → `confirmCreation` удаляет один, второй остаётся → orphan cleanup убивает живой VM. Map по ключу VM instance — один VM = одна запись. |
| `claimPendingVm` с payload-дискриминацией | Два sibling'а одного VM класса (GitlabAvatarVM × 2) — оба имеют pending unmount. Payload отличает "свой" от "чужого". Если payload совпадает — ambiguous guard → null (безопаснее не reclaim'нуть, чем забрать чужой). |
| `reattachVm` в useEffect | Если VM был unmount'нут между render и effect (microtask из scheduleVmUnmount), store его не содержит. reattachVm + mount восстанавливает. |
