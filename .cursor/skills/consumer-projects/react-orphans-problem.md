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

---

## Известная проблема: `claimPendingVm` не различает sibling'ов с одинаковым payload

### Суть проблемы

`claimPendingVm` ищет pending VM по ключу **(VM class + parentId + store + payload)**. Но два sibling'а с одинаковым payload — это один и тот же ключ. Нельзя отличить "свой" VM от "чужого".

### Сценарий 1: Все sibling'ы unmount → ambiguous guard спасает, но ценой потери данных

```
<ParentVM>
  <ChildVM payload={{}} />   ← fiber 0, VM_A
  <ChildVM payload={{}} />   ← fiber 1, VM_B
  <ChildVM payload={{}} />   ← fiber 2, VM_C
  <ChildVM payload={{}} />   ← fiber 3, VM_D
</ParentVM>

Suspense fallback → все 4 unmount → 4 pending unmounts
Suspense resolve → React создаёт 4 новых fiber:

fiber 0 → claimPendingVm(ChildVM, parentId, store, {})
         → нашёл 4 match (VM_A, VM_B, VM_C, VM_D — payload одинаковый!)
         → ambiguous guard → return null
         → создаёт НОВЫЙ VM_E (данные потеряны!)

fiber 1 → claimPendingVm → 4 match → null → новый VM_F
fiber 2 → claimPendingVm → 4 match → null → новый VM_G
fiber 3 → claimPendingVm → 4 match → null → новый VM_H

Итог: 4 старых VM убиты через microtask, 4 новых созданы с нуля.
      Данные (загруженные данные, scroll position и т.д.) — потеряны.
```

**Ambiguous guard** предотвращает захват "левого" VM, но побочный эффект — **ни один VM не реклаймится**. Все создаются заново.

### Сценарий 2: Один sibling unmount → нет ambiguous guard → можно забрать чужой

```
<ParentVM>
  <ChildVM payload={{ id: 1 }} />   ← fiber 0, VM_A
  <ChildVM payload={{ id: 1 }} />   ← fiber 1, VM_B  ← ДУБЛИКАТ payload!
</ParentVM>

Только fiber 1 unmount → VM_B в pendingUnmounts (1 match)

fiber 0 пересоздаётся (fiber умер, React создал новый):
→ claimPendingVm → 1 match (VM_B)
→ реклаймит VM_B! Но это VM от fiber 1, а не от fiber 0
→ VM_B могла иметь состояние от fiber 1 (другие данные, другой scroll)
```

**Ambiguous guard НЕ сработает**, потому что в pendingUnmounts только 1 entry. Функция не может знать, что это "чужой" VM — ключ совпадает.

### Сценарий 3: Payload `{} (empty object)` — все sibling'ы выглядят одинаково

```
<ParentVM>
  <ChildVM />   ← payload = {} (default)
  <ChildVM />   ← payload = {} (default)
  <ChildVM />   ← payload = {} (default)
</ParentVM>

payloadMatches(vm, {}) проверяет isShallowEqual({}, {}) → true
Все 3 sibling'а неразличимы.
```

### Корень проблемы: React fiber identity — одноразовая

```
Fiber A (useId = ":r2") ──► unmount ──► ИДЕНТИЧНОСТЬ ПОТЕРЯНА
                                  │
                                  ▼
Fiber B (useId = ":r5") ──► mount ──► Кто был ":r2"? Никто не знает.
```

React **не даёт** хуку узнать "я — реинкарнация fiber'а :r2". Это фундаментальное ограничение. Каждый подход упирается в одну и ту же стену.

### Почему каждый подход ломается

#### React key через props
```tsx
<ChildVM key="avatar-42" />  // key НЕ доступен внутри хука!
```
React использует key для reconciliation, но **не передаёт его в хуки**. `useId()`, `useRef()`, `useContext()` — ничего не знает про key. Единственный способ — попросить пользователя передать его вручную через payload или config.id.

#### generateId по позиции
```tsx
{items.map((item, i) => <ChildVM config={{ id: `child-${i}` }} />)}
```
Работает **пока порядок не меняется**. Но если список переупорядочился:
```
Было:  [child-0=VM_A, child-1=VM_B, child-2=VM_C]
Стало: [child-2=VM_A, child-0=VM_B, child-1=VM_C]  ← VM_A теперь child-2!
```
claimPendingVmById("child-2") вернёт VM_C, а не VM_A. Данные чужие.

#### Стек вызовов (render order)
```
useCreateViewModel вызывается в порядке: [fiber0, fiber1, fiber2, fiber3]
scheduleVmUnmount вызывается в порядке: [fiber0, fiber1, fiber2, fiber3]
```
**Кажется** что можно сопоставить по порядку. Но:
- React не гарантирует порядок cleanup вызовов
- При StrictMode вызовы удваиваются
- При Suspense fiber может быть discard'нут без cleanup

#### useId как часть claim key
```
Старый fiber: useId = ":r2" → VM.id = ":r2:ChildVM"
Новый fiber:  useId = ":r5" → VM.id = ":r5:ChildVM"

Новый fiber не знает старый ":r2" → не может найти pending VM по id
```
**Идея**: хранить старый useId в VM. Но новый fiber не знает, какой useId искать — он не знает, что он "реинкарнация" fiber'а :r2.

#### Отказ от claimPendingVm
Без claimPendingVm при Suspense/lazy remount:
```
Suspense fallback → VM_A unmount → microtask запланирован
Suspense resolve → новый fiber → новый useId = ":r5"
→ cancelPendingForVm(":r5:PageVM") — не находит ничего (старый был ":r2:PageVM")
→ instantiateVm(":r5:PageVM") → создаёт НОВЫЙ VM_B
→ microtask: VM_A.unmount() → данные потеряны, unmountSignal aborted
```

**Итог**: VM_A убит, VM_B создан с нуля. Все данные потеряны. API-запросы повторяются. Пользователь видит loading spinner вместо контента.

### Возможный подход: FIFO reclaim вместо ambiguous guard

```
Сейчас (ambiguous guard):
  claimPendingVm → 4 match → "много совпадений, не знаю какой" → null → новый VM

FIFO reclaim:
  claimPendingVm → 4 match → "беру первый из очереди" → reclaim VM_A
  claimPendingVm → 3 match → "беру первый из очереди" → reclaim VM_B
  claimPendingVm → 2 match → "беру первый из очереди" → reclaim VM_C
  claimPendingVm → 1 match → "беру последний" → reclaim VM_D
```

**Почему это может работать**: React рендерит и unmount'ит компоненты в tree order. Если порядок детей не меняется, FIFO будет сопоставлять правильные VM.

**Почему это может сломаться**: если порядок детей **изменился**, FIFO даст первому fiber'у VM от последнего sibling'а. Данные будут чужие.

**Но это всё равно лучше чем ambiguous guard** — в большинстве случаев порядок не меняется, и reclaim сработает. А в редких случаях (порядок изменился) — данные будут чужие, но по крайней мере VM не пересоздаётся с нуля.

### Честный ответ

Нет серебряной пули. React 19 не даёт fiber identity хукам — это фундаментальное ограничение.

| Ситуация | Лучший подход |
|----------|--------------|
| Один VM без siblings | ✅ `claimPendingVm` работает идеально |
| explicit id | ✅ `claimPendingVmById` работает идеально |
| Sibling'и с разным payload | ✅ Payload-дискриминация работает |
| Sibling'и с одинаковым payload | ⚠️ Либо ambiguous guard (безопасно, но данные теряются), либо FIFO (данные сохраняются, но могут быть чужие) |

**Единственный 100% надёжный способ** — использовать `config.id` или `generateId` для sibling'ов. Это единственный discriminator, который переживает fiber recreation.
